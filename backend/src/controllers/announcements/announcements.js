import express from "express";
import { prisma } from "../../db/prisma.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  buildAnnouncementVisibilityWhere,
  getVisibleAnnouncements,
  getUnreadCount,
  canUserSeeAnnouncement,
  normalizeAnnouncementScope,
} from "../../utils/announcement-visibility.js";
import {
  validateHierarchy,
  InvalidHierarchyError,
  OutsideFacultyError,
} from "../../utils/validateHierarchy.js";
import { parsePaginationQuery, paginatedPayload } from "../../utils/pagination.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { loadUserAnnouncementScope } from "../../utils/userAnnouncementScope.js";
import { getIo } from "../../socket/hub.js";

const router = express.Router();
const UPLOAD_DIR = "./uploads/announcements";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 10 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

/**
 * @typedef {Object} AnnouncementCreateInput
 * @property {string} title
 * @property {string} content
 * @property {"normal"|"important"|"urgent"} priority
 * @property {"ALL"|"FACULTY"|"DEPARTMENT"|"BATCH"|"SECTION"} targetType
 * @property {number=} facultyId
 * @property {number=} departmentId
 * @property {number=} batchId
 * @property {number=} sectionId
 * @property {string[]=} imageUrls
 */

const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1, "title is required"),
    content: z.string().trim().min(1, "content is required"),
    priority: z.enum(["normal", "important", "urgent"]).default("normal"),
    targetType: z.enum(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]),
    facultyId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    imageUrls: z.array(z.string().trim().min(1)).max(20).default([]),
    targetRoles: z.array(z.string().trim().min(1)).min(1, "At least one target role is required"),
    publishedAt: z.string().optional(),
    isPinned: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "FACULTY" && !data.facultyId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["facultyId"], message: "facultyId is required for FACULTY targetType" });
    }
    if (data.targetType === "DEPARTMENT" && !data.departmentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["departmentId"], message: "departmentId is required for DEPARTMENT targetType" });
    }
    if (data.targetType === "BATCH" && !data.batchId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["batchId"], message: "batchId is required for BATCH targetType" });
    }
    if (data.targetType === "SECTION" && !data.sectionId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sectionId"], message: "sectionId is required for SECTION targetType" });
    }
    if (data.targetType !== "FACULTY" && data.facultyId != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["facultyId"], message: "facultyId is only allowed for FACULTY targetType" });
    }
    if (data.targetType !== "DEPARTMENT" && data.departmentId != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["departmentId"], message: "departmentId is only allowed for DEPARTMENT targetType" });
    }
    if (data.targetType !== "BATCH" && data.batchId != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["batchId"], message: "batchId is only allowed for BATCH targetType" });
    }
    if (data.targetType !== "SECTION" && data.sectionId != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sectionId"], message: "sectionId is only allowed for SECTION targetType" });
    }
  });

const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1).optional(),
    priority: z.enum(["normal", "important", "urgent"]).optional(),
    targetType: z.enum(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]).optional(),
    facultyId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    targetRoles: z.array(z.string().trim().min(1)).min(1, "At least one target role is required").optional(),
    publishedAt: z.string().optional(),
    isPinned: z.coerce.boolean().optional(),
  })
  .strict();

const CREATE_ANNOUNCEMENT_ROLES = new Set(["SUPER_ADMIN", "DEAN"]);
const DEAN_SCOPE_FORBIDDEN = "Dean can only manage their faculty";
const MAX_PINNED_PER_CREATOR = 2;
const IS_NEW_DAYS = Number(process.env.ANNOUNCEMENT_NEW_DAYS) || 7;
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
 * @param {unknown} input
 * @returns {string[]}
 */
function normalizeTargetRoles(input) {
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
    // Keep one canonical lecturer role in DB to match auth payload role names.
    .map((item) => (item === "LECTURER" ? "TEACHER" : item))
    .filter((item) => ANNOUNCEMENT_TARGET_ROLE_OPTIONS.has(item));
  return Array.from(new Set(normalized));
}

/**
 * Dean can only target STUDENT / LECTURER(TEACHER).
 * @param {string} role
 * @param {string[]} targetRoles
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
function validateDeanTargetRoles(role, targetRoles) {
  if (String(role).toUpperCase() !== "DEAN") return { ok: true };
  const disallowed = targetRoles.filter((r) => !DEAN_ALLOWED_TARGET_ROLES.has(r));
  if (disallowed.length > 0) {
    return {
      ok: false,
      status: 400,
      message:
        "Dean can only target STUDENT and LECTURER users",
    };
  }
  return { ok: true };
}

function validateDeanTargetType(role, targetType) {
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

/**
 * @param {unknown} value
 * @returns {Date | null}
 */
function normalizePublishedAt(value) {
  if (value == null || value === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Strict create payload: role gate, dean faculty forced from DB, targeting checks, sanitized fields only.
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} user
 * @param {z.infer<typeof createAnnouncementSchema>} parsed
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, message: string }>}
 */
async function prepareCreateAnnouncementData(user, parsed) {
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
  const priority = parsed.priority ?? "normal";
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

  const imageUrls = Array.isArray(parsed.imageUrls)
    ? parsed.imageUrls.filter((u) => typeof u === "string" && u.trim().length > 0).slice(0, 20)
    : [];
  const targetRoles = normalizeTargetRoles(parsed.targetRoles ?? announcement.targetRoles ?? []);
  const publishedAt = normalizePublishedAt(parsed.publishedAt);
  const isPinned = parsed.isPinned === true;
  if (targetRoles.length === 0) {
    return { ok: false, status: 400, message: "At least one target role is required" };
  }
  const deanRoleCheck = validateDeanTargetRoles(role, targetRoles);
  if (!deanRoleCheck.ok) return deanRoleCheck;

  const payload = {
    title,
    content,
    priority,
    targetType,
    facultyId: sanitizedTargeting.facultyId,
    departmentId: sanitizedTargeting.departmentId,
    batchId: sanitizedTargeting.batchId,
    sectionId: sanitizedTargeting.sectionId,
    imageUrls,
    targetRoles,
    publishedAt,
    isPinned,
  };

  console.log("USER ROLE:", role);
  console.log("DEAN FACULTY:", facultyScope ?? null);
  console.log("FINAL PAYLOAD:", payload);

  return { ok: true, data: payload };
}

/**
 * Create announcement: validate, persist, realtime emit.
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} user
 * @param {z.infer<typeof createAnnouncementSchema>} parsed
 */
async function createAnnouncement(user, parsed) {
  const prep = await prepareCreateAnnouncementData(user, parsed);
  if (!prep.ok) return prep;

  const createdById = Number(user.sub);
  const createdByRole = String(user.role);
  if (prep.data.isPinned) {
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

  const announcement = await prisma.announcement.create({
    data: {
      ...prep.data,
      createdById,
      createdByRole,
    },
    include: { createdBy: { select: { id: true, full_name: true } }, reads: { select: { userId: true } } },
  });
  await emitAnnouncementRealtimeEvent(announcement);
  return { ok: true, announcement };
}

/**
 * @param {number} announcementId
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} jwtUser
 * @param {z.infer<typeof updateAnnouncementSchema>} parsed
 */
async function updateAnnouncement(announcementId, jwtUser, parsed) {
  const userId = Number(jwtUser.sub);
  const role = String(jwtUser.role).toUpperCase();
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
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

  const targetRoles = normalizeTargetRoles(parsed.targetRoles);
  const publishedAt = normalizePublishedAt(parsed.publishedAt);
  const isPinned = parsed.isPinned != null ? parsed.isPinned === true : announcement.isPinned;
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
      facultyScope
    );
  } catch (err) {
    if (err instanceof InvalidHierarchyError || err instanceof OutsideFacultyError) {
      return { ok: false, status: err.status, message: err.message };
    }
    throw err;
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

  const updated = await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      ...(parsed.title != null ? { title: parsed.title.trim() } : {}),
      ...(parsed.content != null ? { content: parsed.content.trim() } : {}),
      ...(parsed.priority != null ? { priority: parsed.priority } : {}),
      targetType,
      facultyId: sanitizedTargeting.facultyId,
      departmentId: sanitizedTargeting.departmentId,
      batchId: sanitizedTargeting.batchId,
      sectionId: sanitizedTargeting.sectionId,
      targetRoles,
      publishedAt,
      isPinned,
    },
    include: {
      createdBy: { select: { id: true, full_name: true, role: { select: { name: true } } } },
      reads: { where: { userId }, select: { userId: true } },
    },
  });
  return { ok: true, announcement: updated };
}

function toAnnouncementDto(announcement, currentUserId) {
  const reads = announcement.reads || [];
  const isRead = reads.some((r) => r.userId === currentUserId);
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    priority: announcement.priority,
    targetType: announcement.targetType,
    targeting: {
      facultyId: announcement.facultyId,
      departmentId: announcement.departmentId,
      batchId: announcement.batchId,
      sectionId: announcement.sectionId,
    },
    imageUrls: announcement.imageUrls || [],
    targetRoles: announcement.targetRoles ?? [],
    createdBy: {
      userId: announcement.createdById,
      role: announcement.createdByRole,
      name: announcement.createdBy?.full_name,
    },
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
    publishedAt: announcement.publishedAt,
    isPinned: announcement.isPinned,
    isActive: announcement.isActive,
    isRead,
    isNew: !isRead && isAnnouncementNew(announcement, currentUserId),
  };
}

/**
 * Fetch read states without selecting legacy `AnnouncementRead.id` to avoid
 * local schema drift issues in mixed environments.
 * @param {number} userId
 * @param {number[]} announcementIds
 * @returns {Promise<Set<number>>}
 */
async function getReadAnnouncementIdSet(userId, announcementIds) {
  if (!announcementIds.length) return new Set();
  const rows = await prisma.$queryRaw`
    SELECT "announcementId"
    FROM "AnnouncementRead"
    WHERE "userId" = ${userId}
      AND "announcementId" = ANY(${announcementIds}::int[])
  `;
  return new Set(
    (Array.isArray(rows) ? rows : [])
      .map((r) => Number(r?.announcementId))
      .filter((n) => Number.isFinite(n))
  );
}

function buildAnnouncementRealtimePayload(announcement) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    priority: announcement.priority,
    targetType: announcement.targetType,
    targeting: {
      facultyId: announcement.facultyId,
      departmentId: announcement.departmentId,
      batchId: announcement.batchId,
      sectionId: announcement.sectionId,
    },
    imageUrls: announcement.imageUrls || [],
    targetRoles: announcement.targetRoles ?? [],
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
    publishedAt: announcement.publishedAt,
    isPinned: announcement.isPinned,
    isActive: announcement.isActive,
  };
}

async function resolveAnnouncementRoutingTargeting(announcement) {
  if (announcement.targetType === "ALL") {
    return {
      facultyId: null,
      departmentId: null,
      batchId: null,
      sectionId: null,
    };
  }

  if (announcement.targetType === "FACULTY") {
    return {
      facultyId: announcement.facultyId ?? null,
      departmentId: null,
      batchId: null,
      sectionId: null,
    };
  }

  if (announcement.targetType === "DEPARTMENT" && announcement.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: announcement.departmentId },
      select: { id: true, facultyId: true },
    });
    return {
      facultyId: department?.facultyId ?? null,
      departmentId: department?.id ?? null,
      batchId: null,
      sectionId: null,
    };
  }

  if (announcement.targetType === "BATCH" && announcement.batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: announcement.batchId },
      include: {
        program: {
          include: {
            department: {
              select: { id: true, facultyId: true },
            },
          },
        },
      },
    });
    return {
      facultyId: batch?.program?.department?.facultyId ?? null,
      departmentId: batch?.program?.department?.id ?? null,
      batchId: batch?.id ?? null,
      sectionId: null,
    };
  }

  if (announcement.targetType === "SECTION" && announcement.sectionId) {
    const section = await prisma.batchSection.findUnique({
      where: { id: announcement.sectionId },
      include: {
        batch: {
          include: {
            program: {
              include: {
                department: { select: { id: true, facultyId: true } },
              },
            },
          },
        },
      },
    });
    return {
      facultyId: section?.batch?.program?.department?.facultyId ?? null,
      departmentId: section?.batch?.program?.department?.id ?? null,
      batchId: section?.batch?.id ?? null,
      sectionId: section?.id ?? null,
    };
  }

  return {
    facultyId: announcement.facultyId ?? null,
    departmentId: announcement.departmentId ?? null,
    batchId: announcement.batchId ?? null,
    sectionId: announcement.sectionId ?? null,
  };
}

/** Faculty used for dean pin scope; ALL uses row.facultyId when set. */
async function getEffectiveFacultyIdForAnnouncement(announcement) {
  if (announcement.targetType === "ALL") {
    return announcement.facultyId ?? null;
  }
  const resolved = await resolveAnnouncementRoutingTargeting(announcement);
  return resolved.facultyId ?? announcement.facultyId ?? null;
}

/** @param {Awaited<ReturnType<typeof loadUserAnnouncementScope>>} loaded */
function visibilityUserFromLoaded(loaded) {
  return {
    id: loaded.userId,
    role: loaded.role,
    facultyIds: loaded.facultyIds,
    departmentIds: loaded.departmentIds,
    batchIds: loaded.batchIds,
    sectionIds: loaded.sectionIds,
  };
}

/** @param {{ reads?: { userId: number }[] }} announcement @param {number} userId */
function isAnnouncementNew(announcement, userId) {
  const reads = announcement.reads || [];
  if (reads.some((r) => r.userId === userId)) return false;
  const ageMs = Date.now() - new Date(announcement.createdAt).getTime();
  return ageMs >= 0 && ageMs < IS_NEW_DAYS * 24 * 60 * 60 * 1000;
}

/** @param {import("@prisma/client").Announcement[]} rows @param {number} userId */
function sortAnnouncementsForList(rows, userId) {
  return [...rows].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const aNew = isAnnouncementNew(a, userId);
    const bNew = isAnnouncementNew(b, userId);
    if (aNew !== bNew) return aNew ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * @param {number} announcementId
 * @param {import("jsonwebtoken").JwtPayload & { sub: string; role: string }} jwtUser
 */
async function togglePin(announcementId, jwtUser) {
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

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
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

  const willPin = !announcement.isPinned;
  const currentPinnedCount = await prisma.announcement.count({
    where: {
      createdById: announcement.createdById,
      isPinned: true,
      isActive: true,
      id: { not: announcement.id },
    },
  });
  console.log("PIN TOGGLE:", announcementId);
  console.log("USER:", role, userId);
  console.log("PIN COUNT (CREATOR):", currentPinnedCount);

  if (willPin && currentPinnedCount >= MAX_PINNED_PER_CREATOR) {
    return {
      ok: false,
      status: 400,
      message: `A creator can pin at most ${MAX_PINNED_PER_CREATOR} announcements`,
    };
  }

  const updated = await prisma.announcement.update({
    where: { id: announcementId },
    data: { isPinned: willPin },
  });

  emitAnnouncementUpdated(updated);
  // Keep pin action resilient across local schema drift (e.g. legacy read IDs).
  return { ok: true, announcement: { ...updated, reads: [] } };
}

function emitAnnouncementUpdated(announcement) {
  const io = getIo();
  if (!io) return;
  io.emit("announcement:updated", {
    id: announcement.id,
    isPinned: announcement.isPinned,
    updatedAt: announcement.updatedAt,
  });
}

/**
 * @param {number} userId
 * @param {number} announcementId
 */
async function markAsRead(userId, announcementId) {
  const loaded = await loadUserAnnouncementScope(prisma, userId);
  if (!loaded) {
    return { ok: false, status: 404, message: "User not found" };
  }
  const visibilityUser = visibilityUserFromLoaded(loaded);

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement) {
    return { ok: false, status: 404, message: "Announcement not found" };
  }

  if (!canUserSeeAnnouncement(visibilityUser, announcement)) {
    return { ok: false, status: 403, message: "Announcement is outside your visibility scope" };
  }

  // Use raw insert to stay resilient across mixed DB states where historical
  // migration drift may keep timestamp column name as read_at/readAt.
  await prisma.$executeRaw`
    INSERT INTO "AnnouncementRead" ("announcementId", "userId")
    VALUES (${announcementId}, ${userId})
    ON CONFLICT ("announcementId", "userId") DO NOTHING
  `;

  return { ok: true };
}

async function emitAnnouncementRealtimeEvent(announcement) {
  const io = getIo();
  if (!io) return;

  const row = await prisma.announcement.findUnique({
    where: { id: announcement.id },
    select: {
      id: true,
      title: true,
      content: true,
      priority: true,
      targetType: true,
      facultyId: true,
      departmentId: true,
      batchId: true,
      sectionId: true,
      imageUrls: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      isPinned: true,
      isActive: true,
      targetRoles: true,
    },
  });
  if (!row) return;
  if (row.publishedAt && new Date(row.publishedAt).getTime() > Date.now()) {
    return;
  }

  const resolvedTargeting = await resolveAnnouncementRoutingTargeting(row);
  const payload = {
    ...buildAnnouncementRealtimePayload(row),
    targeting: {
      facultyId: resolvedTargeting.facultyId ?? row.facultyId ?? null,
      departmentId: resolvedTargeting.departmentId ?? row.departmentId ?? null,
      batchId: resolvedTargeting.batchId ?? row.batchId ?? null,
      sectionId: resolvedTargeting.sectionId ?? row.sectionId ?? null,
    },
  };

  switch (row.targetType) {
    case "ALL":
      io.emit("announcement:new", payload);
      break;
    case "FACULTY": {
      const facultyId = resolvedTargeting.facultyId ?? row.facultyId;
      if (facultyId != null) {
        io.to(`faculty:${facultyId}`).emit("announcement:new", payload);
      }
      break;
    }
    case "DEPARTMENT": {
      const departmentId = resolvedTargeting.departmentId ?? row.departmentId;
      if (departmentId != null) {
        io.to(`department:${departmentId}`).emit("announcement:new", payload);
      }
      break;
    }
    case "BATCH": {
      const batchId = resolvedTargeting.batchId ?? row.batchId;
      if (batchId != null) {
        io.to(`batch:${batchId}`).emit("announcement:new", payload);
      }
      break;
    }
    case "SECTION": {
      const sectionId = resolvedTargeting.sectionId ?? row.sectionId;
      if (sectionId != null) {
        io.to(`section:${sectionId}`).emit("announcement:new", payload);
      }
      break;
    }
    default:
      break;
  }
}

router.get("/", auth, async (req, res) => {
  try {
    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const primaryFacultyId = visibilityUser.facultyIds?.[0] ?? null;
    const primaryDepartmentId = visibilityUser.departmentIds?.[0] ?? null;
    const primaryBatchId = visibilityUser.batchIds?.[0] ?? null;
    const primarySectionId = visibilityUser.sectionIds?.[0] ?? null;

    console.log("USER CONTEXT:", {
      id: visibilityUser?.id ?? null,
      role: visibilityUser?.role ?? null,
      facultyId: primaryFacultyId,
      departmentId: primaryDepartmentId,
      batchId: primaryBatchId,
      sectionId: primarySectionId,
    });

    if (visibilityUser.role === "DEAN" && !primaryFacultyId) {
      throw new Error("Dean missing facultyId");
    }

    let announcements;
    try {
      announcements = await getVisibleAnnouncements(prisma, visibilityUser, {
        internalSkipOrder: true,
        include: {
          createdBy: { select: { id: true, full_name: true, role: { select: { name: true } } } },
        },
      });
    } catch (queryErr) {
      console.error("ANNOUNCEMENTS PRIMARY QUERY FAILED:", queryErr?.message || queryErr);
      const safeWhere = {
        AND: [
          { isActive: true },
          { OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] },
          { targetRoles: { has: String(visibilityUser.role).toUpperCase() } },
          {
            OR: [
              { targetType: "ALL" },
              ...(primaryFacultyId ? [{ facultyId: primaryFacultyId }] : []),
              ...(primaryDepartmentId ? [{ departmentId: primaryDepartmentId }] : []),
              ...(primaryBatchId ? [{ batchId: primaryBatchId }] : []),
              ...(primarySectionId ? [{ sectionId: primarySectionId }] : []),
            ],
          },
        ],
      };
      try {
        announcements = await prisma.announcement.findMany({
          where: safeWhere,
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
          include: {
            createdBy: true,
          },
        });
      } catch (fallbackErr) {
        console.error("ANNOUNCEMENTS FALLBACK QUERY FAILED:", fallbackErr?.message || fallbackErr);
        // Keep UI functional under temporary local schema/client drift.
        announcements = [];
      }
    }

    console.log("RAW RESULT:", announcements?.length ?? 0);

    const announcementIds = (announcements ?? [])
      .map((a) => Number(a?.id))
      .filter((id) => Number.isFinite(id));
    const readAnnouncementIdSet = await getReadAnnouncementIdSet(currentUserId, announcementIds);
    const announcementsWithReads = (announcements ?? []).map((a) => ({
      ...a,
      reads: readAnnouncementIdSet.has(Number(a.id)) ? [{ userId: currentUserId }] : [],
    }));

    const sorted = sortAnnouncementsForList(announcementsWithReads, currentUserId);
    const mapped = sorted.map((a) =>
      toAnnouncementDto(
        {
          ...a,
          priority: a.priority ?? "normal",
          targetRoles: Array.isArray(a.targetRoles) ? a.targetRoles : [],
        },
        currentUserId
      )
    );

    const { page, pageSize } = parsePaginationQuery(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });
    const list = mapped || [];
    const total = list.length;
    const start = (page - 1) * pageSize;
    const results = list.slice(start, start + pageSize);
    return res.json(paginatedPayload({ total, page, pageSize, results }));
  } catch (e) {
    console.error("API Error:", e);
    console.error("STACK:", e?.stack);
    // Defensive: avoid breaking announcements page if local Prisma client/db are out of sync.
    const { page, pageSize } = parsePaginationQuery(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });
    if (e?.code === "P2032") {
      return res.json(paginatedPayload({ total: 0, page, pageSize, results: [] }));
    }
    return res
      .status(500)
      .json(apiErrorBody(e?.message || "Failed to fetch announcements", null));
  }
});

router.get("/unread-count", auth, async (req, res) => {
  try {
    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const unreadCount = await getUnreadCount(prisma, visibilityUser);

    res.json({ unreadCount });
  } catch (e) {
    console.error("API Error:", e);
    console.error("STACK:", e?.stack);
    if (e?.code === "P2032") {
      return res.json({ unreadCount: 0 });
    }
    return res.status(500).json(apiErrorBody(e?.message || "Failed to fetch unread count", null));
  }
});

/** Same scope vectors as announcement list (for client-side visibility mirror checks). */
router.get("/me-visibility", auth, async (req, res) => {
  try {
    const currentUserId = Number(req.user.sub);
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const deanPrimaryFacultyId =
      loaded.role === "DEAN" && loaded.facultyIds?.length ? loaded.facultyIds[0] : null;
    res.json({ visibilityUser, deanPrimaryFacultyId });
  } catch (error) {
    console.error("GET me-visibility Error:", error);
    res.status(500).json(apiErrorBody("Failed to load visibility scope", null));
  }
});

router.post("/", auth, requireRole("SUPER_ADMIN", "DEAN"), upload.array("images", 10), async (req, res) => {
  try {
    const createdById = Number(req.user.sub);
    const hostBase = `${req.protocol}://${req.get("host")}`;
    const uploadedImageUrls = (req.files || []).map((file) => `${hostBase}/uploads/announcements/${file.filename}`);
    const bodyImageUrls = req.body.imageUrls
      ? Array.isArray(req.body.imageUrls)
        ? req.body.imageUrls
        : [req.body.imageUrls]
      : [];
    const bodyTargetRoles = req.body.targetRoles
      ? Array.isArray(req.body.targetRoles)
        ? req.body.targetRoles
        : [req.body.targetRoles]
      : [];
    /** @type {AnnouncementCreateInput} */
    const parsed = createAnnouncementSchema.parse({
      ...req.body,
      imageUrls: [...bodyImageUrls, ...uploadedImageUrls],
      targetRoles: normalizeTargetRoles(bodyTargetRoles),
      publishedAt: req.body.publishedAt,
    });

    const result = await createAnnouncement(req.user, parsed);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    res.status(201).json(toAnnouncementDto(result.announcement, createdById));
  } catch (error) {
    console.error("POST Announcement Error:", error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message === "Only image files are allowed") {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    res.status(500).json(apiErrorBody("Failed to create announcement", null));
  }
});

router.delete("/:id", auth, requireRole("SUPER_ADMIN", "DEAN"), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    await prisma.announcement.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ success: true, id });
  } catch (error) {
    console.error("DELETE Announcement Error:", error);
    res.status(500).json(apiErrorBody("Failed to delete announcement", null));
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const currentUserId = Number(req.user.sub);
    const readResult = await markAsRead(currentUserId, id);
    if (!readResult.ok) {
      return res.status(readResult.status).json({ message: readResult.message });
    }

    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);

    const announcement = await prisma.announcement.findFirst({
      where: { AND: [{ id }, buildAnnouncementVisibilityWhere(visibilityUser)] },
      include: {
        createdBy: { select: { id: true, full_name: true, role: { select: { name: true } } } },
        reads: {
          where: { userId: currentUserId },
          select: { userId: true },
        },
      },
    });

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json(toAnnouncementDto(announcement, currentUserId));
  } catch (error) {
    console.error("GET Announcement detail Error:", error);
    res.status(500).json(apiErrorBody("Failed to fetch announcement", null));
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }
    const normalizedTargetRoles = req.body?.targetRoles
      ? normalizeTargetRoles(
          Array.isArray(req.body.targetRoles)
            ? req.body.targetRoles
            : [req.body.targetRoles]
        )
      : undefined;
    const parsed = updateAnnouncementSchema.parse({
      ...req.body,
      ...(normalizedTargetRoles ? { targetRoles: normalizedTargetRoles } : {}),
      publishedAt: req.body?.publishedAt,
    });
    const userId = Number(req.user.sub);
    const result = await updateAnnouncement(id, req.user, parsed);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.json(toAnnouncementDto(result.announcement, userId));
  } catch (error) {
    console.error("PATCH announcement Error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to update announcement", null));
  }
});

router.patch("/:id/pin", auth, requireRole("SUPER_ADMIN", "DEAN"), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const userId = Number(req.user.sub);
    const result = await togglePin(id, req.user);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    res.json(toAnnouncementDto(result.announcement, userId));
  } catch (error) {
    console.error("PATCH pin Error:", error);
    res.status(500).json(apiErrorBody("Failed to toggle pin", null));
  }
});

router.post("/:id/read", auth, async (req, res) => {
  try {
    const announcementId = Number(req.params.id);
    const userId = Number(req.user.sub);

    if (!Number.isFinite(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const result = await markAsRead(userId, announcementId);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("READ Announcement Error:", error);
    res.status(500).json(apiErrorBody("Failed to mark as read", null));
  }
});

export default router;
