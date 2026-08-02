import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';
import { userId } from './shared.js';

/**
 * Owner or active moderator (ADMIN / DEAN membership role) may manage join requests.
 * @returns {Promise<{ club: { serverId: number, ownerId: number | null, slug?: string }, uid: number } | { error: { status: number, body: object } }>}
 */
export async function requireClubModerator(req, clubId, { selectSlug = false } = {}) {
  const uid = userId(req);
  if (!Number.isFinite(uid) || uid <= 0) {
    return { error: { status: 401, body: apiErrorBody('Unauthorized') } };
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      serverId: true,
      ownerId: true,
      ...(selectSlug ? { slug: true } : {}),
    },
  });
  if (!club?.serverId) {
    return { error: { status: 404, body: apiErrorBody('Club not found') } };
  }

  const ownerId = club.ownerId == null ? null : Number(club.ownerId);
  if (ownerId === uid) return { club, uid };

  const mem = await prisma.discussionGroupMembership.findFirst({
    where: {
      groupId: club.serverId,
      userId: uid,
      leftAt: null,
      isActive: true,
      role: { in: ['ADMIN', 'DEAN'] },
    },
    select: { id: true },
  });
  if (!mem) {
    return {
      error: {
        status: 403,
        body: apiErrorBody('Only club owner or moderators can view requests'),
      },
    };
  }

  return { club, uid };
}
