import { prisma } from '../../db/prisma.js';

/**
 * Annotate clubs with the caller's join relationship.
 * @param {Array<{ id: number, serverId?: number | null }>} clubs
 * @param {number} userId
 * @returns {Promise<Array<object & { viewerJoinStatus: 'NONE' | 'MEMBER' | 'PENDING' }>>}
 */
export async function attachViewerJoinState(clubs, userId) {
  if (!clubs.length || !Number.isFinite(userId)) {
    return clubs.map((c) => ({ ...c, viewerJoinStatus: 'NONE' }));
  }

  const clubIds = clubs.map((c) => c.id);
  const serverIds = clubs.map((c) => c.serverId).filter((id) => Number.isFinite(id));

  const [memberships, pending] = await Promise.all([
    serverIds.length
      ? prisma.discussionGroupMembership.findMany({
          where: {
            userId,
            groupId: { in: serverIds },
            leftAt: null,
            isActive: true,
          },
          select: { groupId: true },
        })
      : Promise.resolve([]),
    prisma.clubJoinRequest.findMany({
      where: { userId, clubId: { in: clubIds }, status: 'PENDING' },
      select: { clubId: true },
    }),
  ]);

  const memberServers = new Set(memberships.map((m) => m.groupId));
  const pendingClubs = new Set(pending.map((p) => p.clubId));

  return clubs.map((club) => {
    let viewerJoinStatus = 'NONE';
    if (club.serverId && memberServers.has(club.serverId)) viewerJoinStatus = 'MEMBER';
    else if (pendingClubs.has(club.id)) viewerJoinStatus = 'PENDING';
    return { ...club, viewerJoinStatus };
  });
}
