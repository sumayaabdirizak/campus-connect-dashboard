import { prisma } from "../../../../db/prisma.js";
import {
  validateHierarchy,
  InvalidHierarchyError,
  OutsideFacultyError,
} from "../../../../utils/validateHierarchy.js";
import { sanitizeAnnouncementHtml } from "../announcementHtml.js";
import {
  MAX_PINNED_PER_CREATOR,
  normalizeTargetRoles,
  validateFacultyScopedTargetRoles,
  validateFacultyScopedTargetType,
  normalizeExpiresAt,
  validateExtraTargets,
} from "../announcementService.helpers.js";
import { parseExtraTargetsFromParsed } from "../create/prepareHelpers.js";
import { resolveNextStatus } from "./scheduleFields.js";
import { assembleUpdateAnnouncementRow } from "./assembleRow.js";

function isFacultyScopedPublisher(role, loaded) {
  const r = String(role || "").toUpperCase();
  if (r === "DEAN") return true;
  if (r === "OFFICE_STAFF" && (loaded.facultyIds?.length ?? 0) > 0) return true;
  return false;
}

/**
 * @param {object} ctx
 * @param {object} parsed
 * @param {object} schedule
 */
export async function buildAnnouncementUpdateData(ctx, parsed, schedule) {
  const { announcement, announcementId, role, loaded } = ctx;
  const { publishedAt, forceDraftFromClearSchedule } = schedule;

  const targetRoles =
    parsed.targetRoles !== undefined
      ? normalizeTargetRoles(parsed.targetRoles)
      : normalizeTargetRoles(announcement.targetRoles);
  if (targetRoles.length === 0) {
    return { ok: false, status: 400, message: "At least one target role is required" };
  }

  const facultyScoped = isFacultyScopedPublisher(role, loaded);
  const roleCheck = validateFacultyScopedTargetRoles(facultyScoped, targetRoles);
  if (!roleCheck.ok) return roleCheck;

  const targetType = parsed.targetType ?? announcement.targetType;
  const typeCheck = validateFacultyScopedTargetType(facultyScoped, targetType);
  if (!typeCheck.ok) return typeCheck;

  const scopedFacultyId = facultyScoped ? (loaded.facultyIds?.[0] ?? null) : null;
  const rawFaculty = facultyScoped
    ? scopedFacultyId
    : (parsed.facultyId ?? announcement.facultyId ?? null);
  const facultyScope = facultyScoped ? (loaded.facultyIds?.[0] ?? undefined) : undefined;

  let sanitizedTargeting;
  try {
    sanitizedTargeting = await validateHierarchy(
      prisma,
      {
        facultyId: rawFaculty,
        departmentId: parsed.departmentId ?? announcement.departmentId ?? null,
        batchId: parsed.batchId ?? announcement.batchId ?? null,
        sectionId: parsed.sectionId ?? announcement.sectionId ?? null,
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
    parsed.targets !== undefined ? parseExtraTargetsFromParsed({ targets: parsed.targets }) : null;
  if (extraTargets != null) {
    const extraCheck = await validateExtraTargets(prisma, extraTargets, facultyScope);
    if (!extraCheck.ok) return extraCheck;
  }

  const expiresAt =
    parsed.expiresAt !== undefined ? normalizeExpiresAt(parsed.expiresAt) : announcement.expiresAt;
  const pinWindowActive = Boolean(expiresAt && expiresAt.getTime() > Date.now());
  const isPinned = pinWindowActive;

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

  const nextStatus = resolveNextStatus(announcement, parsed, schedule);
  const bodyMarkdown =
    parsed.bodyMarkdown !== undefined
      ? String(parsed.bodyMarkdown).trim()
      : announcement.bodyMarkdown ?? undefined;
  const bodyHtmlSanitized =
    parsed.bodyHtml !== undefined ? sanitizeAnnouncementHtml(parsed.bodyHtml) : undefined;

  return {
    ok: true,
    extraTargets,
    data: assembleUpdateAnnouncementRow({
      parsed,
      announcement,
      targetType,
      sanitizedTargeting,
      targetRoles,
      publishedAt,
      expiresAt,
      isPinned,
      nextStatus,
      bodyMarkdown,
      bodyHtmlSanitized,
    }),
    forceDraftFromClearSchedule,
    prevStatus: schedule.prevStatus,
  };
}
