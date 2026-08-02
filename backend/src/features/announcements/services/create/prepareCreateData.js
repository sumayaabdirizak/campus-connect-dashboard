import { prisma } from "../../../../db/prisma.js";
import {
  validateHierarchy,
  InvalidHierarchyError,
  OutsideFacultyError,
} from "../../../../utils/validateHierarchy.js";
import { sanitizeAnnouncementHtml } from "../announcementHtml.js";
import { announcementLog } from "../../announcementLogger.js";
import {
  CREATE_ANNOUNCEMENT_ROLES,
  validatePublishedAtForScheduleUpsert,
  defaultTargetRolesForCreator,
  normalizeTargetRoles,
  validateFacultyScopedTargetRoles,
  validateFacultyScopedTargetType,
  normalizePublishedAt,
  validateExtraTargets,
  deriveInitialStatus,
} from "../announcementService.helpers.js";
import { parseExtraTargetsFromParsed, resolveCreatorFacultyScope } from "./prepareHelpers.js";
import { assembleCreateAnnouncementRow } from "./assembleRow.js";

export async function prepareCreateAnnouncementData(user, parsed) {
  const role = String(user.role);
  const userId = Number(user.sub);

  if (!CREATE_ANNOUNCEMENT_ROLES.has(role)) {
    return {
      ok: false,
      status: 403,
      message: "Only SUPER_ADMIN, ACADEMIC_OFFICE, DEAN, or OFFICE_STAFF may create announcements",
    };
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
  const scopeResult = await resolveCreatorFacultyScope(prisma, role, userId, parsed);
  if (!scopeResult.ok) return scopeResult;
  const { facultyIdForTargeting, facultyScope, facultyScoped } = scopeResult;

  const typeCheck = validateFacultyScopedTargetType(facultyScoped, targetType);
  if (!typeCheck.ok) return typeCheck;

  let sanitizedTargeting;
  try {
    sanitizedTargeting = await validateHierarchy(
      prisma,
      {
        facultyId: facultyIdForTargeting,
        departmentId: parsed.departmentId ?? null,
        batchId: parsed.batchId ?? null,
        sectionId: parsed.sectionId ?? null,
      },
      facultyScope
    );
  } catch (err) {
    if (err instanceof InvalidHierarchyError || err instanceof OutsideFacultyError) {
      return { ok: false, status: err.status, message: err.message };
    }
    throw err;
  }

  const extraTargets = parseExtraTargetsFromParsed(parsed);
  const extraCheck = await validateExtraTargets(prisma, extraTargets, facultyScope);
  if (!extraCheck.ok) return extraCheck;

  const publishedAt = normalizePublishedAt(parsed.publishedAt);
  const scheduleCheck = validatePublishedAtForScheduleUpsert({
    status: parsed.status,
    publishedAt,
  });
  if (!scheduleCheck.ok) return scheduleCheck;

  let targetRoles = normalizeTargetRoles(parsed.targetRoles ?? []);
  if (targetRoles.length === 0) {
    targetRoles = defaultTargetRolesForCreator(role, facultyScoped);
  }
  const roleCheck = validateFacultyScopedTargetRoles(facultyScoped, targetRoles);
  if (!roleCheck.ok) return roleCheck;

  announcementLog("info", "announcement.prepare_create", {
    userId,
    role,
    targetType,
    status: deriveInitialStatus(parsed),
    facultyScope: facultyScope ?? null,
    facultyScoped,
  });

  return {
    ok: true,
    data: assembleCreateAnnouncementRow({
      role,
      parsed,
      sanitizedTargeting,
      extraTargets,
      targetType,
      content,
      bodyHtml: sanitizeAnnouncementHtml(parsed.bodyHtml ?? null),
      facultyScoped,
    }),
  };
}
