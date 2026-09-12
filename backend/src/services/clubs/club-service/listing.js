import { prisma } from '../../../db/prisma.js';
import { attachClubMessageActivity } from './attach-activity.js';

export async function getClubBySlug(slug, { includePending = false, viewerUserId = null } = {}) {
  const club = await prisma.club.findUnique({
    where: { slug: String(slug).trim().toLowerCase() },
    include: {
      faculty: true,
      owner: { select: { id: true, full_name: true } },
      interests: { include: { tag: true } },
      server: { select: { id: true, publicId: true } },
      _count: { select: { requests: { where: { status: 'PENDING' } } } },
    },
  });
  if (!club) return null;
  if (!includePending && club.status === 'PENDING' && club.ownerId !== viewerUserId) {
    return null;
  }
  return club;
}

/** Stored membership roles that the API surfaces as the `MODERATOR` club role. */
const MODERATOR_MEMBERSHIP_ROLES = new Set(['ADMIN', 'DEAN']);

/** Shared shape so `/clubs/mine` clubs carry the same fields as `/clubs`. */
const clubCardInclude = {
  faculty: { select: { id: true, name: true } },
  interests: { include: { tag: { select: { slug: true, label: true } } } },
  server: { select: { id: true, publicId: true } },
  _count: { select: { requests: { where: { status: 'PENDING' } } } },
};

export async function listClubsForUser(userId) {
  const [owned, memberships] = await Promise.all([
    prisma.club.findMany({
      where: { ownerId: userId, status: { not: 'ARCHIVED' } },
      include: clubCardInclude,
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
        ...clubCardInclude,
        server: {
          select: {
            id: true,
            publicId: true,
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

  // Keep server.publicId for formatClubForApi; drop membership rows from the wire payload.
  const memberOf = memberships.map(({ server, ...club }) => ({
    ...club,
    server: server
      ? { id: server.id, publicId: server.publicId }
      : null,
    membershipRole: server?.memberships?.[0]?.role || 'MEMBER',
  }));

  const [ownedWithActivity, memberWithActivity] = await Promise.all([
    attachClubMessageActivity(owned, userId),
    attachClubMessageActivity(memberOf, userId),
  ]);

  return {
    owned: ownedWithActivity,
    memberOf: memberWithActivity,
    moderating: memberWithActivity.filter((c) =>
      MODERATOR_MEMBERSHIP_ROLES.has(c.membershipRole)
    ),
  };
}
