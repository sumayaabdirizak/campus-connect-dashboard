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
  validateDeanTargetRoles,
  validateDeanTargetType,
  normalizeExpiresAt,
  validateExtraTargets,
} from "../announcementService.helpers.js";
import { parseExtraTargetsFromParsed } from "../create/prepareHelpers.js";
import { resolveNextStatus } from "./scheduleFields.js";
import { assembleUpdateAnnouncementRow } from "./assembleRow.js";

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

  const deanRoleCheck = validateDeanTargetRoles(role, targetRoles);
  if (!deanRoleCheck.ok) return deanRoleCheck;

  const targetType = parsed.targetType ?? announcement.targetType;
  const deanTargetTypeCheck = validateDeanTargetType(role, targetType);
  if (!deanTargetTypeCheck.ok) return deanTargetTypeCheck;

  const deanFacultyId = role === "DEAN" ? (loaded.facultyIds?.[0] ?? null) : null;
  const rawFaculty = role === "DEAN" ? deanFacultyId : (parsed.facultyId ?? announcement.facultyId ?? null);
  const facultyScope = role === "DEAN" ? (loaded.facultyIds?.[0] ?? undefined) : undefined;

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
