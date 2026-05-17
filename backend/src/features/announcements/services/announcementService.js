import { prisma } from "../../../db/prisma.js";
import {
  validateHierarchy,
  InvalidHierarchyError,
  OutsideFacultyError,
} from "../../../utils/validateHierarchy.js";
import { loadUserAnnouncementScope } from "../../../utils/userAnnouncementScope.js";
import {
  canUserSeeAnnouncement,
} from "./announcementVisibility.service.js";
import { sanitizeAnnouncementHtml } from "./announcementHtml.js";
import { mergeAnnouncementTargetRows, replaceAnnouncementTargets } from "./announcementTargets.service.js";
import { announcementLog } from "../announcementLogger.js";
import {
  emitAnnouncementRealtimeEvent,
  emitAnnouncementUpdatedFanout,
} from "./announcementRealtime.service.js";
import { invalidateAnnouncementAnalyticsCache } from "./announcementAnalytics.service.js";
import {
  enqueueAnnouncementJobs,
  enqueueAnnouncementJobsStrict,
  AnnouncementSchedulerUnavailableError,
} from "./announcementJobs.service.js";
import {
  isAnnouncementNew,
  previewAnnouncementSnapshot,
  ANNOUNCEMENT_LIKE_EMOJI,
} from "../dto/announcementDto.js";

const announcementEngagementCountInclude = {
  _count: {
    select: {
      comments: { where: { deletedAt: null } },
      reactions: { where: { emoji: ANNOUNCEMENT_LIKE_EMOJI } },
    },
  },
};

export const CREATE_ANNOUNCEMENT_ROLES = new Set(["SUPER_ADMIN", "DEAN"]);
export const DEAN_SCOPE_FORBIDDEN = "Dean can only manage their faculty";
export const MAX_PINNED_PER_CREATOR = 2;

/** Minimum lead time before `publishedAt` for scheduled posts (seconds). Default 120 (2 minutes). */
export function getAnnouncementScheduleMinLeadMs() {
  const sec = Number(process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS ?? 120);
  if (!Number.isFinite(sec)) return 120_000;
  return Math.min(Math.max(Math.trunc(sec), 60), 86400) * 1000;
}

/**
 * Validates `publishedAt` when the client intends to schedule (non-draft).
 * @param {{ status?: string; publishedAt?: Date | null }} input
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
export function validatePublishedAtForScheduleUpsert(input) {
  const status = String(input.status ?? "").toUpperCase();
  if (status === "DRAFT") return { ok: true };
  const pub = input.publishedAt;
  if (pub == null) return { ok: true };
  const t = pub instanceof Date ? pub.getTime() : new Date(pub).getTime();
  if (Number.isNaN(t)) {
    return { ok: false, status: 400, message: "publishedAt is invalid" };
  }
  const now = Date.now();
  if (t <= now) {
    return { ok: false, status: 400, message: "publishedAt must be in the future" };
  }
  const min = now + getAnnouncementScheduleMinLeadMs();
  if (t < min) {
    return {
      ok: false,
      status: 400,
      message: `publishedAt must be at least ${Math.round(getAnnouncementScheduleMinLeadMs() / 60000)} minute(s) in the future`,
    };
  }
  return { ok: true };
}

const ANNOUNCEMENT_TARGET_ROLE_OPTIONS = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "DEAN",
  "LECTURER",
  "TEACHER",
  "STUDENT",
]);
const DEAN_ALLOWED_TARGET_ROLES = new Set(["STUDENT", "TEACHER", "LECTURER"]);

/**
 * Default audience when the client omits `targetRoles` (matches prior “all roles in scope” intent).
 * @param {string} creatorRole
 * @returns {string[]}
 */
export function defaultTargetRolesForCreator(creatorRole) {
  const r = String(creatorRole ?? "").toUpperCase();
  if (r === "DEAN") {
    return ["STUDENT", "TEACHER"];
  }
  return ["STUDENT", "TEACHER", "ADMIN", "DEAN", "SUPER_ADMIN"];
}

/**
 * @param {unknown} input
 * @returns {string[]}
 */
export function normalizeTargetRoles(input) {
  const list = Array.isArray(input) ? input : input != null ? [input] : [];
  const normalized = list
    .flatMap((item) => {
      if (typeof item !== "string") return [];
      const trimmed = item.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [trimmed];
        } catch {
          return [trimmed];
        }
      }
      return [trimmed];
    })
    .map((item) => String(item).toUpperCase())
    .map((item) => (item === "LECTURER" ? "TEACHER" : item))
    .filter((item) => ANNOUNCEMENT_TARGET_ROLE_OPTIONS.has(item));
  return Array.from(new Set(normalized));
}

/**
 * @param {string} role
 * @param {string[]} targetRoles
 */
export function validateDeanTargetRoles(role, targetRoles) {
  if (String(role).toUpperCase() !== "DEAN") return { ok: true };
  const disallowed = targetRoles.filter((r) => !DEAN_ALLOWED_TARGET_ROLES.has(r));
  if (disallowed.length > 0) {
    return {
      ok: false,
      status: 400,
      message: "Dean can only target STUDENT and LECTURER users",
    };
  }
  return { ok: true };
}

export function validateDeanTargetType(role, targetType) {
  if (String(role).toUpperCase() !== "DEAN") return { ok: true };
  if (!["DEPARTMENT", "BATCH", "SECTION"].includes(String(targetType).toUpperCase())) {
    return {
      ok: false,
      status: 400,
      message: "Dean targetType must be one of: DEPARTMENT, BATCH, SECTION",
    };
  }
  return { ok: true };
}

/** @param {unknown} value */
export function normalizePublishedAt(value) {
  if (value == null || value === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** @param {unknown} value */
export function normalizeExpiresAt(value) {
  return normalizePublishedAt(value);
}

/** @param {unknown} p */
export function toPrismaPriority(p) {
  const u = String(p ?? "normal").toUpperCase();
  if (u === "IMPORTANT") return "IMPORTANT";
  if (u === "URGENT") return "URGENT";
  return "NORMAL";
}

/**
 * @param {{ publishedAt?: string | null; status?: string }} parsed
 */
export function deriveInitialStatus(parsed) {
  if (parsed.status === "DRAFT") return "DRAFT";
  const pub = normalizePublishedAt(parsed.publishedAt);
  if (pub && pub.getTime() > Date.now()) return "SCHEDULED";
  return "PUBLISHED";
}

/**
 * @param {{ scopeType: string; scopeId: number }[]} targets
 * @param {import("@prisma/client").PrismaClient} prismaClient
 * @param {string|number|undefined|null} facultyScope
 */
async function validateExtraTargets(prismaClient, targets, facultyScope) {
  for (const t of targets) {
    const st = String(t.scopeType).toUpperCase();
    const sid = Number(t.scopeId);
    if (!Number.isFinite(sid)) {
      return { ok: false, status: 400, message: "Invalid target scopeId" };
    }
    /** @type {Record<string, number | null>} */
    const targeting = {
      facultyId: null,
      departmentId: null,
      batchId: null,
      sectionId: null,
    };
    if (st === "FACULTY") targeting.facultyId = sid;
    else if (st === "DEPARTMENT") targeting.departmentId = sid;
    else if (st === "BATCH") targeting.batchId = sid;
    else if (st === "SECTION") targeting.sectionId = sid;
    else {
      return { ok: false, status: 400, message: "Invalid target scopeType" };
    }
    try {
      await validateHierarchy(prismaClient, targeting, facultyScope);
    } catch (err) {
      if (err instanceof InvalidHierarchyError || err instanceof OutsideFacultyError) {
        return { ok: false, status: err.status, message: err.message };
      }
      throw err;
    }
  }
  return { ok: true };
}

/**
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} user
 * @param {object} parsed
 */
export async function prepareCreateAnnouncementData(user, parsed) {
  const role = String(user.role);
  const userId = Number(user.sub);

  if (!CREATE_ANNOUNCEMENT_ROLES.has(role)) {
    return { ok: false, status: 403, message: "Only SUPER_ADMIN or DEAN may create announcements" };
  }

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const content = typeof parsed.content === "string" ? parsed.content.trim() : "";
  if (!title || !content) {
    return { ok: false, status: 400, message: "title and content are required" };
  }
  if (!parsed.targetType) {
    return { ok: false, status: 400, message: "targetType is required" };
  }

  const targetType = parsed.targetType;
  const deanTargetTypeCheck = validateDeanTargetType(role, targetType);
  if (!deanTargetTypeCheck.ok) return deanTargetTypeCheck;

  const rawDepartmentId = parsed.departmentId ?? null;
  const rawBatchId = parsed.batchId ?? null;
  const rawSectionId = parsed.sectionId ?? null;

  /** @type {number | null} */
  let facultyIdForTargeting = null;
  /** @type {string | number | undefined} */
  let facultyScope;

  if (role === "DEAN") {
    const dean = await prisma.deanProfile.findUnique({
      where: { userId },
      select: { facultyId: true },
    });
    if (!dean) {
      return { ok: false, status: 403, message: "Dean profile not found" };
    }
    facultyIdForTargeting = dean.facultyId;
    facultyScope = dean.facultyId;
  } else {
    facultyIdForTargeting = parsed.facultyId ?? null;
    facultyScope = undefined;
  }

  let sanitizedTargeting;
  try {
    sanitizedTargeting = await validateHierarchy(
      prisma,
      {
        facultyId: facultyIdForTargeting,
        departmentId: rawDepartmentId,
        batchId: rawBatchId,
        sectionId: rawSectionId,
      },
      facultyScope,
    );
  } catch (err) {
    if (err instanceof InvalidHierarchyError || err instanceof OutsideFacultyError) {
      return { ok: false, status: err.status, message: err.message };
    }
    throw err;
  }

  const extraTargets = Array.isArray(parsed.targets)
    ? parsed.targets
        .map((t) => ({
          scopeType: String(t?.scopeType ?? "").toUpperCase(),
          scopeId: Number(t?.scopeId),
        }))
        .filter((t) => ["FACULTY", "DEPARTMENT", "BATCH", "SECTION"].includes(t.scopeType) && Number.isFinite(t.scopeId))
    : [];

  const extraCheck = await validateExtraTargets(prisma, extraTargets, facultyScope);
  if (!extraCheck.ok) return extraCheck;

  const imageUrls = Array.isArray(parsed.imageUrls)
    ? parsed.imageUrls.filter((u) => typeof u === "string" && u.trim().length > 0).slice(0, 20)
    : [];
  let targetRoles = normalizeTargetRoles(parsed.targetRoles ?? []);
  if (targetRoles.length === 0) {
    targetRoles = defaultTargetRolesForCreator(role);
  }
  const publishedAt = normalizePublishedAt(parsed.publishedAt);
  const scheduleCheck = validatePublishedAtForScheduleUpsert({
    status: parsed.status,
    publishedAt,
  });
  if (!scheduleCheck.ok) return scheduleCheck;
  const expiresAt = normalizeExpiresAt(parsed.expiresAt);
  const deadlineAt = normalizePublishedAt(parsed.deadlineAt);
  // The legacy "Pin to top" toggle was replaced by the Active-days feature:
  // an announcement is pinned iff its expiresAt window is in the future.
  // Any explicit `isPinned` value on the request is ignored so a client
  // cannot manually pin a row without setting an active-days window — that
  // is what keeps MAX_PINNED_PER_CREATOR meaningful and ensures every pin
  // auto-expires into a normal announcement when its window closes.
  const pinWindowActive = Boolean(expiresAt && expiresAt.getTime() > Date.now());
  const isPinned = pinWindowActive;
  const status = deriveInitialStatus(parsed);
  const publishedAtForRow = status === "DRAFT" ? null : normalizePublishedAt(parsed.publishedAt);
  const bodyMarkdown =
    typeof parsed.bodyMarkdown === "string" && parsed.bodyMarkdown.trim()
      ? parsed.bodyMarkdown.trim()
      : content;
  const bodyHtml = sanitizeAnnouncementHtml(parsed.bodyHtml ?? null);

  const deanRoleCheck = validateDeanTargetRoles(role, targetRoles);
  if (!deanRoleCheck.ok) return deanRoleCheck;

  const payload = {
    title,
    content,
    bodyMarkdown,
    bodyHtml,
    priority: toPrismaPriority(parsed.priority),
    targetType,
    status,
    facultyId: sanitizedTargeting.facultyId,
    departmentId: sanitizedTargeting.departmentId,
    batchId: sanitizedTargeting.batchId,
    sectionId: sanitizedTargeting.sectionId,
    imageUrls,
    targetRoles,
    publishedAt: publishedAtForRow,
    expiresAt,
    ...(parsed.deadlineAt !== undefined ? { deadlineAt } : {}),
    isPinned,
    acknowledgementRequired: Boolean(parsed.acknowledgementRequired),
    commentsEnabled: Boolean(parsed.commentsEnabled),
    extraTargets,
  };

  announcementLog("info", "announcement.prepare_create", {
    userId,
    role,
    targetType,
    status,
    facultyScope: facultyScope ?? null,
  });

  return { ok: true, data: payload };
}

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} db
 * @param {number} actorId
 * @param {number} announcementId
 * @param {string} action
 * @param {unknown} [before]
 * @param {unknown} [after]
 */
export async function writeAnnouncementAudit(db, actorId, announcementId, action, before, after) {
  try {
    await db.announcementAudit.create({
      data: {
        announcementId,
        actorId,
        action,
        before: before === undefined ? undefined : JSON.parse(JSON.stringify(before)),
        after: after === undefined ? undefined : JSON.parse(JSON.stringify(after)),
      },
    });
  } catch (err) {
    announcementLog("warn", "announcement.audit_skip", {
      announcementId,
      message: err?.message ?? String(err),
    });
  }
}

/**
 * @param {string} prevStatus
 * @param {string} nextStatus
 * @param {{ forceDraftFromClearSchedule?: boolean }} opts
 */
export function resolveAnnouncementUpdateAuditAction(prevStatus, nextStatus, opts = {}) {
  const prev = String(prevStatus ?? "").toUpperCase();
  const next = String(nextStatus ?? "").toUpperCase();
  if (opts.forceDraftFromClearSchedule) return "EDIT";
  if (prev === next) return "EDIT";
  if (next === "ARCHIVED") return "DELETE";
  if (next === "EXPIRED") return "EXPIRE";
  if (next === "PUBLISHED" && (prev === "DRAFT" || prev === "SCHEDULED")) return "PUBLISH";
  if (next === "SCHEDULED") return "SCHEDULE";
  return "EDIT";
}

/**
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} user
 * @param {object} parsed
 */
export async function createAnnouncement(user, parsed) {
  const prep = await prepareCreateAnnouncementData(user, parsed);
  if (!prep.ok) return prep;

  const createdById = Number(user.sub);
  const createdByRole = String(user.role);
  const { extraTargets, ...rowData } = prep.data;

  if (rowData.isPinned) {
    const pinnedByCreator = await prisma.announcement.count({
      where: { createdById, isPinned: true, isActive: true },
    });
    if (pinnedByCreator >= MAX_PINNED_PER_CREATOR) {
      return {
        ok: false,
        status: 400,
        message: `A creator can pin at most ${MAX_PINNED_PER_CREATOR} announcements`,
      };
    }
  }

  let announcement;
  try {
    announcement = await prisma.$transaction(async (tx) => {
      const baseCreate = {
        ...rowData,
        createdById,
        createdByRole,
      };
      const created = await tx.announcement.create({
        data: baseCreate,
        include: {
          createdBy: { select: { id: true, full_name: true } },
          reads: { select: { userId: true } },
          targets: { select: { scopeType: true, scopeId: true } },
          ...announcementEngagementCountInclude,
        },
      });
      const merged = mergeAnnouncementTargetRows(created, extraTargets);
      await replaceAnnouncementTargets(tx, created.id, merged);
      await writeAnnouncementAudit(tx, createdById, created.id, "CREATE", null, {
        snapshot: previewAnnouncementSnapshot(created),
      });
      const row = await tx.announcement.findUnique({
        where: { id: created.id },
        include: {
          createdBy: { select: { id: true, full_name: true } },
          reads: { select: { userId: true } },
          targets: { select: { scopeType: true, scopeId: true } },
          ...announcementEngagementCountInclude,
        },
      });
      // Critical-path enqueue for SCHEDULED — if BullMQ is enabled but Redis
      // is down, we must roll the row back rather than leave it orphaned in
      // SCHEDULED state with no worker to publish it.
      if (row && String(row.status ?? "").toUpperCase() === "SCHEDULED") {
        await enqueueAnnouncementJobsStrict(row);
      }
      return row;
    });
  } catch (err) {
    if (err instanceof AnnouncementSchedulerUnavailableError) {
      announcementLog("error", "announcement.create_scheduler_unavailable", {
        message: err.message,
      });
      return {
        ok: false,
        status: 503,
        message: "Announcement scheduler is unavailable. Please retry shortly.",
      };
    }
    throw err;
  }

  if (!announcement) {
    return { ok: false, status: 500, message: "Failed to create announcement" };
  }
  const createdStatus = String(announcement.status ?? "").toUpperCase();
  if (createdStatus !== "DRAFT") {
    // SCHEDULED already enqueued strictly inside the tx; this best-effort
    // call covers PUBLISHED-with-expiresAt and is safe to no-op on failure.
    if (createdStatus !== "SCHEDULED") {
      await enqueueAnnouncementJobs(announcement);
    }
    await emitAnnouncementRealtimeEvent(announcement);
  }
  return { ok: true, announcement };
}

/**
 * @param {number} announcementId
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} jwtUser
 * @param {object} parsed
 */
export async function updateAnnouncement(announcementId, jwtUser, parsed) {
  const userId = Number(jwtUser.sub);
  const role = String(jwtUser.role).toUpperCase();
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  if (!announcement) {
    return { ok: false, status: 404, message: "Announcement not found" };
  }

  const isPrivileged = role === "SUPER_ADMIN" || role === "ADMIN" || role === "DEAN";
  if (!isPrivileged && announcement.createdById !== userId) {
    return { ok: false, status: 403, message: "You do not have permission to edit this announcement" };
  }

  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) return { ok: false, status: 404, message: "User not found" };
  const visibilityUser = visibilityUserFromLoaded(loaded);
  if (!canUserSeeAnnouncement(visibilityUser, announcement) && !isPrivileged) {
    return { ok: false, status: 403, message: "Announcement is outside your visibility scope" };
  }

  // Defence-in-depth: a DEAN may only edit announcements that belong to their
  // own faculty. `canUserSeeAnnouncement` can return true for cross-faculty
  // rows in some edge cases (e.g. an announcement that's been retargeted
  // since the dean last viewed it, or visibility helpers that broaden the
  // scope for read but not for write). This guard explicitly rejects any
  // dean attempt to mutate a row anchored to a different faculty.
  if (role === "DEAN") {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId },
      select: { facultyId: true },
    });
    if (!deanProfile) {
      return { ok: false, status: 403, message: DEAN_SCOPE_FORBIDDEN };
    }
    const announcementFacultyIds = new Set();
    if (announcement.facultyId != null) announcementFacultyIds.add(announcement.facultyId);
    // Multi-target rows: every FACULTY-scoped target must also match.
    for (const t of announcement.targets ?? []) {
      if (String(t.scopeType).toUpperCase() === "FACULTY") {
        announcementFacultyIds.add(Number(t.scopeId));
      }
    }
    for (const fid of announcementFacultyIds) {
      if (fid !== deanProfile.facultyId) {
        announcementLog("warn", "announcement.dean_cross_faculty_edit_blocked", {
          announcementId,
          deanUserId: userId,
          deanFacultyId: deanProfile.facultyId,
          announcementFacultyId: fid,
        });
        return {
          ok: false,
          status: 403,
          message: DEAN_SCOPE_FORBIDDEN,
        };
      }
    }
  }

  const beforeSnap = previewAnnouncementSnapshot(announcement);

  const prevStatus = String(announcement.status ?? "").toUpperCase();
  const explicitNextStatus = parsed.status != null ? String(parsed.status).toUpperCase() : null;

  const targetRoles =
    parsed.targetRoles !== undefined
      ? normalizeTargetRoles(parsed.targetRoles)
      : normalizeTargetRoles(announcement.targetRoles);
  let publishedAt =
    parsed.publishedAt !== undefined ? normalizePublishedAt(parsed.publishedAt) : announcement.publishedAt;

  /** SCHEDULED + `publishedAt: null` without explicit status → cancel schedule (DRAFT). */
  let forceDraftFromClearSchedule =
    prevStatus === "SCHEDULED" &&
    parsed.publishedAt !== undefined &&
    publishedAt === null &&
    explicitNextStatus == null;

  if (explicitNextStatus === "DRAFT") {
    publishedAt = null;
  }

  if (parsed.publishedAt !== undefined) {
    const st = prevStatus;
    if (st === "SCHEDULED") {
      if (publishedAt != null) {
        const chk = validatePublishedAtForScheduleUpsert({
          status: explicitNextStatus ?? announcement.status,
          publishedAt,
        });
        if (!chk.ok) return chk;
      }
    } else if (st === "DRAFT" && publishedAt && publishedAt.getTime() > Date.now()) {
      const chk = validatePublishedAtForScheduleUpsert({
        status: explicitNextStatus ?? "PUBLISHED",
        publishedAt,
      });
      if (!chk.ok) return chk;
    } else if (
      publishedAt &&
      publishedAt.getTime() > Date.now() + getAnnouncementScheduleMinLeadMs() &&
      st !== "DRAFT" &&
      st !== "SCHEDULED"
    ) {
      return {
        ok: false,
        status: 400,
        message:
          "Only announcements in SCHEDULED status can set a future publishedAt; cancel schedule or edit a scheduled post",
      };
    }
  }

  if (prevStatus === "PUBLISHED" && explicitNextStatus === "SCHEDULED") {
    return { ok: false, status: 400, message: "Cannot move a published announcement to scheduled" };
  }
  if (explicitNextStatus === "PUBLISHED" && publishedAt && publishedAt.getTime() > Date.now()) {
    return {
      ok: false,
      status: 400,
      message:
        "Cannot mark as published before the scheduled publish time; reschedule, wait for publish, or cancel schedule",
    };
  }
  if (
    prevStatus === "SCHEDULED" &&
    publishedAt === null &&
    explicitNextStatus != null &&
    explicitNextStatus !== "DRAFT" &&
    explicitNextStatus !== "ARCHIVED"
  ) {
    return {
      ok: false,
      status: 400,
      message: "Clearing publish time requires status DRAFT (cancel schedule) or ARCHIVED",
    };
  }
  const expiresAt =
    parsed.expiresAt !== undefined ? normalizeExpiresAt(parsed.expiresAt) : announcement.expiresAt;
  const deadlineAt =
    parsed.deadlineAt !== undefined ? normalizePublishedAt(parsed.deadlineAt) : announcement.deadlineAt;
  // isPinned is derived from the Active-days window (expiresAt) only. The
  // legacy explicit `isPinned` flag on the request is ignored — clients
  // extend a pin by setting a future expiresAt, and unpin by clearing it.
  const pinEnd = expiresAt;
  const pinWindowActive = Boolean(pinEnd && pinEnd.getTime() > Date.now());
  const isPinned = pinWindowActive;
  if (targetRoles.length === 0) {
    return { ok: false, status: 400, message: "At least one target role is required" };
  }
  const deanRoleCheck = validateDeanTargetRoles(role, targetRoles);
  if (!deanRoleCheck.ok) return deanRoleCheck;

  const targetType = parsed.targetType ?? announcement.targetType;
  const deanTargetTypeCheck = validateDeanTargetType(role, targetType);
  if (!deanTargetTypeCheck.ok) return deanTargetTypeCheck;
  const deanFacultyId = role === "DEAN" ? (loaded.facultyIds?.[0] ?? null) : null;
  const rawFaculty = role === "DEAN" ? deanFacultyId : (parsed.facultyId ?? announcement.facultyId ?? null);
  const rawDepartment = parsed.departmentId ?? announcement.departmentId ?? null;
  const rawBatch = parsed.batchId ?? announcement.batchId ?? null;
  const rawSection = parsed.sectionId ?? announcement.sectionId ?? null;
  const facultyScope = role === "DEAN" ? (loaded.facultyIds?.[0] ?? undefined) : undefined;
  let sanitizedTargeting;
  try {
    sanitizedTargeting = await validateHierarchy(
      prisma,
      {
        facultyId: rawFaculty,
        departmentId: rawDepartment,
        batchId: rawBatch,
        sectionId: rawSection,
      },
      facultyScope,
    );
  } catch (err) {
    if (err instanceof InvalidHierarchyError || err instanceof OutsideFacultyError) {
      return { ok: false, status: err.status, message: err.message };
    }
    throw err;
  }

  const extraTargets =
    parsed.targets !== undefined
      ? Array.isArray(parsed.targets)
        ? parsed.targets
            .map((t) => ({
              scopeType: String(t?.scopeType ?? "").toUpperCase(),
              scopeId: Number(t?.scopeId),
            }))
            .filter(
              (t) =>
                ["FACULTY", "DEPARTMENT", "BATCH", "SECTION"].includes(t.scopeType) && Number.isFinite(t.scopeId),
            )
        : []
      : null;

  if (extraTargets != null) {
    const extraCheck = await validateExtraTargets(prisma, extraTargets, facultyScope);
    if (!extraCheck.ok) return extraCheck;
  }

  if (isPinned) {
    const pinnedByCreator = await prisma.announcement.count({
      where: {
        createdById: announcement.createdById,
        isPinned: true,
        isActive: true,
        id: { not: announcementId },
      },
    });
    if (pinnedByCreator >= MAX_PINNED_PER_CREATOR) {
      return {
        ok: false,
        status: 400,
        message: `A creator can pin at most ${MAX_PINNED_PER_CREATOR} announcements`,
      };
    }
  }

  let nextStatus = announcement.status;
  if (forceDraftFromClearSchedule) {
    nextStatus = "DRAFT";
  } else if (parsed.status != null) {
    const allowed = new Set(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]);
    if (allowed.has(String(parsed.status))) {
      nextStatus = String(parsed.status);
    }
  } else if (publishedAt && publishedAt.getTime() > Date.now()) {
    nextStatus = "SCHEDULED";
  } else if (publishedAt && publishedAt.getTime() <= Date.now() && announcement.status === "SCHEDULED") {
    nextStatus = "PUBLISHED";
  }

  const bodyMarkdown =
    parsed.bodyMarkdown !== undefined
      ? String(parsed.bodyMarkdown).trim()
      : announcement.bodyMarkdown ?? undefined;
  const bodyHtmlSanitized =
    parsed.bodyHtml !== undefined ? sanitizeAnnouncementHtml(parsed.bodyHtml) : undefined;

  const data = {
    ...(parsed.title != null ? { title: parsed.title.trim() } : {}),
    ...(parsed.content != null ? { content: parsed.content.trim() } : {}),
    ...(bodyMarkdown !== undefined ? { bodyMarkdown } : {}),
    ...(parsed.bodyHtml !== undefined ? { bodyHtml: bodyHtmlSanitized } : {}),
    ...(parsed.priority != null ? { priority: toPrismaPriority(parsed.priority) } : {}),
    targetType,
    facultyId: sanitizedTargeting.facultyId,
    departmentId: sanitizedTargeting.departmentId,
    batchId: sanitizedTargeting.batchId,
    sectionId: sanitizedTargeting.sectionId,
    targetRoles,
    publishedAt,
    expiresAt,
    ...(parsed.deadlineAt !== undefined ? { deadlineAt } : {}),
    isPinned,
    status: nextStatus,
    version: { increment: 1 },
    ...(parsed.acknowledgementRequired != null
      ? { acknowledgementRequired: Boolean(parsed.acknowledgementRequired) }
      : {}),
    ...(parsed.commentsEnabled != null ? { commentsEnabled: Boolean(parsed.commentsEnabled) } : {}),
  };

  if (parsed.deadlineAt !== undefined) {
    await prisma.calendarReminderJob.deleteMany({ where: { announcementId } });
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const row = await tx.announcement.update({
        where: { id: announcementId },
        data,
        include: {
          createdBy: { select: { id: true, full_name: true, role: { select: { name: true } } } },
          reads: { where: { userId }, select: { userId: true } },
          targets: { select: { scopeType: true, scopeId: true } },
          ...announcementEngagementCountInclude,
        },
      });
      const targetsToWrite =
        extraTargets != null ? mergeAnnouncementTargetRows(row, extraTargets) : mergeAnnouncementTargetRows(row, []);
      await replaceAnnouncementTargets(tx, announcementId, targetsToWrite);
      const auditAction = resolveAnnouncementUpdateAuditAction(prevStatus, String(row.status ?? ""), {
        forceDraftFromClearSchedule,
      });
      await writeAnnouncementAudit(tx, userId, announcementId, auditAction, beforeSnap, {
        snapshot: previewAnnouncementSnapshot(row),
      });
      const finalRow = await tx.announcement.findUnique({
        where: { id: announcementId },
        include: {
          createdBy: { select: { id: true, full_name: true, role: { select: { name: true } } } },
          reads: { where: { userId }, select: { userId: true } },
          targets: { select: { scopeType: true, scopeId: true } },
          ...announcementEngagementCountInclude,
        },
      });
      // Roll back the update if transitioning to SCHEDULED and the publish
      // queue can't accept the job (Redis down) — otherwise the announcement
      // is silently stuck.
      if (finalRow && String(finalRow.status ?? "").toUpperCase() === "SCHEDULED") {
        await enqueueAnnouncementJobsStrict(finalRow);
      }
      return finalRow;
    });
  } catch (err) {
    if (err instanceof AnnouncementSchedulerUnavailableError) {
      announcementLog("error", "announcement.update_scheduler_unavailable", {
        announcementId,
        message: err.message,
      });
      return {
        ok: false,
        status: 503,
        message: "Announcement scheduler is unavailable. Please retry shortly.",
      };
    }
    throw err;
  }

  if (updated) {
    const updatedStatus = String(updated.status ?? "").toUpperCase();
    if (updatedStatus !== "DRAFT" && updatedStatus !== "SCHEDULED") {
      // SCHEDULED already enqueued strictly inside the tx above.
      await enqueueAnnouncementJobs(updated);
    }
    if (prevStatus === "DRAFT" && updatedStatus !== "DRAFT") {
      await emitAnnouncementRealtimeEvent(updated);
    }
    await emitAnnouncementUpdatedFanout(updated);
  }
  return { ok: true, announcement: updated };
}

/**
 * @param {number} announcementId
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} jwtUser
 */
export async function togglePin(announcementId, jwtUser) {
  const userId = Number(jwtUser.sub);
  const role = String(jwtUser.role);

  if (!CREATE_ANNOUNCEMENT_ROLES.has(role)) {
    return { ok: false, status: 403, message: "Only SUPER_ADMIN or DEAN may pin announcements" };
  }

  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) {
    return { ok: false, status: 404, message: "User not found" };
  }
  const visibilityUser = visibilityUserFromLoaded(loaded);

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  if (!announcement) {
    return { ok: false, status: 404, message: "Announcement not found" };
  }

  if (!canUserSeeAnnouncement(visibilityUser, announcement)) {
    return { ok: false, status: 403, message: "Announcement is outside your visibility scope" };
  }

  if (role === "DEAN") {
    const dean = await prisma.deanProfile.findUnique({
      where: { userId },
      select: { facultyId: true },
    });
    if (!dean) {
      return { ok: false, status: 403, message: DEAN_SCOPE_FORBIDDEN };
    }
    try {
      await validateHierarchy(
        prisma,
        {
          facultyId: dean.facultyId,
          departmentId: announcement.departmentId,
          batchId: announcement.batchId,
          sectionId: announcement.sectionId,
        },
        dean.facultyId,
      );
    } catch (err) {
      if (err instanceof InvalidHierarchyError || err instanceof OutsideFacultyError) {
        return { ok: false, status: err.status, message: err.message };
      }
      throw err;
    }
  }

  // The pin-count check and the row update must be serialized against other
  // concurrent toggles by the same creator — otherwise two parallel requests
  // can both pass the `count < MAX_PINNED_PER_CREATOR` check and produce
  // (MAX + 1) pinned rows. We use a Postgres transaction-scoped advisory lock
  // keyed by (classid=PIN_LOCK_CLASSID, objid=createdById) so concurrent
  // toggles by the same creator queue up, while toggles by different creators
  // remain fully concurrent. The lock auto-releases at COMMIT/ROLLBACK.
  const PIN_LOCK_CLASSID = 91011;
  const PIN_LIMIT_EXCEEDED = Symbol("PIN_LIMIT_EXCEEDED");

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PIN_LOCK_CLASSID}::int4, ${announcement.createdById}::int4)`;

      // Re-read inside the lock: another concurrent toggle may have flipped
      // `isPinned` between our outer read and acquiring the lock.
      const fresh = await tx.announcement.findUnique({
        where: { id: announcementId },
        select: { isPinned: true, createdById: true, isActive: true },
      });
      if (!fresh || fresh.isActive === false) {
        throw new Error("ANNOUNCEMENT_GONE");
      }

      const willPin = !fresh.isPinned;
      if (willPin) {
        const currentPinnedCount = await tx.announcement.count({
          where: {
            createdById: fresh.createdById,
            isPinned: true,
            isActive: true,
            id: { not: announcementId },
          },
        });
        announcementLog("info", "announcement.pin_toggle", {
          announcementId,
          role,
          userId,
          pinnedCount: currentPinnedCount,
          willPin,
        });
        if (currentPinnedCount >= MAX_PINNED_PER_CREATOR) {
          throw PIN_LIMIT_EXCEEDED;
        }
      } else {
        announcementLog("info", "announcement.pin_toggle", {
          announcementId,
          role,
          userId,
          willPin,
        });
      }

      const row = await tx.announcement.update({
        where: { id: announcementId },
        data: { isPinned: willPin, version: { increment: 1 } },
      });
      await writeAnnouncementAudit(tx, userId, announcementId, "PIN_TOGGLE", { isPinned: fresh.isPinned }, {
        isPinned: row.isPinned,
      });
      return row;
    });
  } catch (err) {
    if (err === PIN_LIMIT_EXCEEDED) {
      return {
        ok: false,
        status: 400,
        message: `A creator can pin at most ${MAX_PINNED_PER_CREATOR} announcements`,
      };
    }
    if (err?.message === "ANNOUNCEMENT_GONE") {
      return { ok: false, status: 404, message: "Announcement not found" };
    }
    throw err;
  }

  await emitAnnouncementUpdatedFanout(updated);
  return { ok: true, announcement: { ...updated, reads: [] } };
}

/**
 * @param {number} userId
 * @param {number} announcementId
 */
export async function markAsRead(userId, announcementId) {
  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) {
    return { ok: false, status: 404, message: "User not found" };
  }
  const visibilityUser = visibilityUserFromLoaded(loaded);

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  if (!announcement) {
    return { ok: false, status: 404, message: "Announcement not found" };
  }

  if (!canUserSeeAnnouncement(visibilityUser, announcement)) {
    return { ok: false, status: 403, message: "Announcement is outside your visibility scope" };
  }

  await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: { announcementId, userId },
    },
    create: { announcementId, userId },
    update: {},
  });
  invalidateAnnouncementAnalyticsCache(announcementId);

  return { ok: true };
}

/**
 * @param {number} userId
 * @param {number[]} announcementIds
 */
export async function markAsReadBulk(userId, announcementIds) {
  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) {
    return { ok: false, status: 404, message: "User not found" };
  }
  const visibilityUser = visibilityUserFromLoaded(loaded);
  const ids = [...new Set(announcementIds.map((n) => Number(n)).filter((n) => Number.isFinite(n)))];
  if (ids.length === 0) {
    return { ok: true, marked: [] };
  }
  if (ids.length > 200) {
    return { ok: false, status: 400, message: "Too many ids (max 200)" };
  }

  const announcements = await prisma.announcement.findMany({
    where: { id: { in: ids } },
    include: { targets: { select: { scopeType: true, scopeId: true } } },
  });
  const visible = announcements.filter((a) => canUserSeeAnnouncement(visibilityUser, a));
  const visibleIds = visible.map((a) => a.id);
  if (!visibleIds.length) {
    return { ok: true, marked: [] };
  }

  await prisma.announcementRead.createMany({
    data: visibleIds.map((announcementId) => ({ announcementId, userId })),
    skipDuplicates: true,
  });
  for (const aid of visibleIds) invalidateAnnouncementAnalyticsCache(aid);

  return { ok: true, marked: visibleIds };
}

/**
 * @param {number} userId
 * @param {number[]} announcementIds
 * @returns {Promise<Set<number>>}
 */
export async function getReadAnnouncementIdSet(userId, announcementIds) {
  if (!announcementIds.length) return new Set();
  const rows = await prisma.announcementRead.findMany({
    where: {
      userId,
      announcementId: { in: announcementIds },
    },
    select: { announcementId: true },
  });
  return new Set(rows.map((r) => Number(r.announcementId)).filter((n) => Number.isFinite(n)));
}

/** @param {Awaited<ReturnType<typeof loadUserAnnouncementScope>>} loaded */
export function visibilityUserFromLoaded(loaded) {
  return {
    id: loaded.userId,
    role: loaded.role,
    facultyIds: loaded.facultyIds,
    departmentIds: loaded.departmentIds,
    batchIds: loaded.batchIds,
    sectionIds: loaded.sectionIds,
  };
}

/** @param {import("@prisma/client").Announcement[]} rows @param {number} userId */
export function sortAnnouncementsForList(rows, userId) {
  return [...rows].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const aNew = isAnnouncementNew(a, userId);
    const bNew = isAnnouncementNew(b, userId);
    if (aNew !== bNew) return aNew ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}