import { prisma } from '../../../db/prisma.js';
import { attachClubMessageActivity } from './attach-activity.js';

export async function getClubBySlug(slug, { includePending = false, viewerUserId = null } = {}) {
  const club = await prisma.club.findUnique({
    where: { slug: String(slug).trim().toLowerCase() },
    include: {
      faculty: true,
      owner: { select: { id: true, full_name: true } },
      interests: { include: { tag: true } },
    },
  });
  if (!club) return null;
  if (!includePending && club.status === 'PENDING' && club.ownerId !== viewerUserId) {
    return null;
  }
  return club;
}

export async function listClubsForUser(userId) {
  const [owned, memberships] = await Promise.all([
    prisma.club.findMany({
      where: { ownerId: userId, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.club.findMany({
      where: {
        status: 'APPROVED',
        serverId: { not: null },
        server: {
          memberships: {
            some: { userId, leftAt: null, isActive: true },
          },
        },
        ownerId: { not: userId },
      },
      include: {
        server: {
          select: {
            memberships: {
              where: { userId, leftAt: null, isActive: true },
              select: { role: true },
            },
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    }),
  ]);

  const memberOf = memberships.map((club) => ({
    ...club,
    membershipRole: club.server?.memberships?.[0]?.role || 'MEMBER',
  }));

  const [ownedWithActivity, memberWithActivity] = await Promise.all([
    attachClubMessageActivity(owned, userId),
    attachClubMessageActivity(memberOf, userId),
  ]);

  return {
    owned: ownedWithActivity,
    memberOf: memberWithActivity,
    moderating: memberWithActivity.filter((c) => c.membershipRole === 'MODERATOR'),
  };
}
