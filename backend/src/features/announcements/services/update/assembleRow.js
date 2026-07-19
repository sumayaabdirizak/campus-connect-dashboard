import { normalizePublishedAt, toPrismaPriority } from "../announcementService.helpers.js";

export function assembleUpdateAnnouncementRow(input) {
  const {
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
  } = input;

  return {
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
    ...(parsed.deadlineAt !== undefined ? { deadlineAt: normalizePublishedAt(parsed.deadlineAt) } : {}),
    isPinned,
    status: nextStatus,
    version: { increment: 1 },
    ...(parsed.acknowledgementRequired != null
      ? { acknowledgementRequired: Boolean(parsed.acknowledgementRequired) }
      : {}),
    ...(parsed.commentsEnabled != null ? { commentsEnabled: Boolean(parsed.commentsEnabled) } : {}),
  };
}
