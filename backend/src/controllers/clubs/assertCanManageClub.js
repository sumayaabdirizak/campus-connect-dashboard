import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';

/** Owner or club moderator (ADMIN membership). */
export async function assertCanManageClub(clubId, uid) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, serverId: true, ownerId: true },
  });
  if (!club) return { error: { status: 404, body: apiErrorBody('Club not found') } };
  const ownerId = club.ownerId == null ? null : Number(club.ownerId);
  const callerId = Number(uid);
  if (ownerId != null && ownerId === callerId) return { club };
  const mem = await prisma.discussionGroupMembership.findFirst({
    where: {
      groupId: club.serverId,
      userId: callerId,
      leftAt: null,
      isActive: true,
      role: { in: ['ADMIN', 'DEAN'] },
    },
  });
  if (!mem) return { error: { status: 403, body: apiErrorBody('Forbidden') } };
  return { club };
}
