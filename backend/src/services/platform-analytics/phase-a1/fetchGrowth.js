import { prisma } from '../../../db/prisma.js';
import { safe, facultyUserWhere } from '../analytics-helpers.js';
import { aggregateUsersByMonth } from '../helpers/aggregations.js';

export async function fetchGrowthMetrics({ scopedFacultyId, since, announcementWhere }) {
  const [userByMonth, roleGroups, facultyAnnouncementIds] = await Promise.all([
    aggregateUsersByMonth(since, scopedFacultyId),
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

  return { userByMonth, roleGroups, facultyAnnouncementIds };
}
