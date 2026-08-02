import { isAnnouncementNew } from "../dto/announcementDto.js";

/** @param {Awaited<ReturnType<typeof import("../../../utils/userAnnouncementScope.js").loadUserAnnouncementScope>>} loaded */
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
