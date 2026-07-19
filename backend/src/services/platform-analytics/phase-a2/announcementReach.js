import { prisma } from '../../../db/prisma.js';
import { safe } from '../analytics-helpers.js';

export async function computeAnnouncementReach({
  scopedFacultyId,
  activeStudents,
  facultyAnnouncementIds,
}) {
  const announcementIds = facultyAnnouncementIds.map((a) => a.id);
  const announcementReaders = await safe(async () => {
    if (!announcementIds.length) return [];
    const readWhere = {
      announcementId: { in: announcementIds },
      ...(scopedFacultyId
        ? { user: { studentProfile: { facultyId: scopedFacultyId } } }
        : {}),
    };
    return prisma.announcementRead.groupBy({
      by: ['userId'],
      where: readWhere,
    });
  }, []);
  const announcementReach =
    activeStudents > 0
      ? Math.round(Math.min(announcementReaders.length, activeStudents) / activeStudents * 100)
      : 0;

  return { announcementIds, announcementReaders, announcementReach };
}
