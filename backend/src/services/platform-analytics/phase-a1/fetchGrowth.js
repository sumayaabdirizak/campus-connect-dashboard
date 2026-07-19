import { prisma } from '../../../db/prisma.js';
import { safe, facultyUserWhere } from '../analytics-helpers.js';

export async function fetchGrowthMetrics({ scopedFacultyId, since, announcementWhere }) {
  const [userGrowthRows, roleGroups, facultyAnnouncementIds] = await Promise.all([
    safe(
      () =>
        scopedFacultyId
          ? prisma.user.findMany({
              where: {
                created_at: { gte: since },
                ...facultyUserWhere(scopedFacultyId),
              },
              select: { created_at: true },
            })
          : prisma.user.findMany({
              where: { created_at: { gte: since } },
              select: { created_at: true },
            }),
      []
    ),
    safe(
      () =>
        scopedFacultyId
          ? prisma.user.groupBy({
              by: ['roleId'],
              where: facultyUserWhere(scopedFacultyId),
              _count: { _all: true },
            })
          : prisma.user.groupBy({
              by: ['roleId'],
              _count: { _all: true },
            }),
      []
    ),
    safe(
      () =>
        scopedFacultyId
          ? prisma.announcement.findMany({
              where: announcementWhere,
              select: { id: true },
            })
          : prisma.announcement.findMany({
              where: { status: 'PUBLISHED' },
              select: { id: true },
            }),
      []
    ),
  ]);

  return { userGrowthRows, roleGroups, facultyAnnouncementIds };
}
