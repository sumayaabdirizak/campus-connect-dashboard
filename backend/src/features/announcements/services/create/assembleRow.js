import {
  defaultTargetRolesForCreator,
  normalizeTargetRoles,
  normalizePublishedAt,
  normalizeExpiresAt,
  toPrismaPriority,
  deriveInitialStatus,
} from "../announcementService.helpers.js";

/**
 * @param {object} input
 * @param {string} input.role
 * @param {object} input.parsed
 * @param {object} input.sanitizedTargeting
 * @param {Array} input.extraTargets
 * @param {string} input.targetType
 * @param {string} input.content
 */
export function assembleCreateAnnouncementRow(input) {
  const { role, parsed, sanitizedTargeting, extraTargets, targetType, content } = input;
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";

  const imageUrls = Array.isArray(parsed.imageUrls)
    ? parsed.imageUrls.filter((u) => typeof u === "string" && u.trim().length > 0).slice(0, 20)
    : [];
  let targetRoles = normalizeTargetRoles(parsed.targetRoles ?? []);
  if (targetRoles.length === 0) {
    targetRoles = defaultTargetRolesForCreator(role);
  }

  const expiresAt = normalizeExpiresAt(parsed.expiresAt);
  const pinWindowActive = Boolean(expiresAt && expiresAt.getTime() > Date.now());
  const status = deriveInitialStatus(parsed);
  let publishedAtForRow = status === "DRAFT" ? null : normalizePublishedAt(parsed.publishedAt);
  if (status === "PUBLISHED") {
    if (publishedAtForRow == null || publishedAtForRow.getTime() > Date.now()) {
      publishedAtForRow = new Date();
    }
  }
  const deadlineAt = normalizePublishedAt(parsed.deadlineAt);
  const bodyMarkdown =
    typeof parsed.bodyMarkdown === "string" && parsed.bodyMarkdown.trim()
      ? parsed.bodyMarkdown.trim()
      : content;

  return {
    title,
    content,
    bodyMarkdown,
    bodyHtml: input.bodyHtml,
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
    isPinned: pinWindowActive,
    acknowledgementRequired: Boolean(parsed.acknowledgementRequired),
    commentsEnabled: Boolean(parsed.commentsEnabled),
    extraTargets,
  };
}
