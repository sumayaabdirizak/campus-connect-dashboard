import { prisma } from "../db/prisma.js";

/**
 * Auto-announcement dispatcher for per-course feeds.
 *
 * Each call upserts a CoursePost keyed by (courseOfferingId, source, sourceKey)
 * so hooks fired multiple times — e.g. a cron that re-runs every minute — do
 * not flood the feed. Pass a stable, content-free key (e.g. "schedule:42:start").
 *
 * `authorId` is the system user posting on behalf of the platform. For now we
 * reuse the offering's teacher when available; if there is no teacher we fall
 * back to the first SUPER_ADMIN. Callers can override via `actorId`.
 *
 * @typedef {"SESSION"|"ATTENDANCE"|"DEAN"|"REGISTRATION"} AutoSource
 * @param {{
 *   courseOfferingId: number,
 *   source: AutoSource,
 *   sourceKey: string,
 *   title: string,
 *   content: string,
 *   isImportant?: boolean,
 *   actorId?: number,
 * }} input
 */
export async function dispatchCoursePost(input) {
  const {
    courseOfferingId,
    source,
    sourceKey,
    title,
    content,
    isImportant = false,
    actorId,
  } = input;

  if (!courseOfferingId || !source || !sourceKey || !title || !content) {
    throw new Error("dispatchCoursePost: missing required fields");
  }

  let authorId = actorId;
  if (!authorId) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      select: { teacherId: true },
    });
    authorId = offering?.teacherId ?? null;
  }
  if (!authorId) {
    const superAdmin = await prisma.user.findFirst({
      where: { role: { name: "SUPER_ADMIN" } },
      select: { id: true },
    });
    authorId = superAdmin?.id;
  }
  if (!authorId) {
    // Nothing we can post as. Silently no-op rather than crashing the caller.
    return null;
  }

  return prisma.coursePost.upsert({
    where: {
      courseOfferingId_source_sourceKey: { courseOfferingId, source, sourceKey },
    },
    create: {
      courseOfferingId,
      authorId,
      source,
      sourceKey,
      title,
      content,
      isImportant,
    },
    update: {
      // Refresh content for evolving events (e.g. attendance summary updates as
      // more records are saved). Pin/important stay as the caller set them last.
      title,
      content,
      isImportant,
    },
  });
}
