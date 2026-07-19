import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError, formatClubForApi } from '../shared.js';

const router = express.Router();

router.post('/:id/join', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, status: true, serverId: true, joinPolicy: true, ownerId: true, slug: true },
    });
    if (!club || club.status !== 'APPROVED') {
      return res.status(404).json(apiErrorBody('Club not found or not available'));
    }
    if (!club.serverId) {
      return res.status(409).json(apiErrorBody('Club server not provisioned'));
    }

    // Already a member?
    const existing = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true },
    });
    if (existing) {
      return res.status(409).json({ error: 'Already a member', code: 'CLUB_ALREADY_MEMBER' });
    }

    if (club.joinPolicy === 'INVITE_ONLY') {
      return res.status(403).json({ error: 'This club is invite-only', code: 'CLUB_INVITE_ONLY' });
    }

    if (club.joinPolicy === 'BY_REQUEST') {
      // Check if they already have a pending request
      const pendingReq = await prisma.clubJoinRequest.findFirst({
        where: { clubId, userId: uid, status: 'PENDING' },
      });
      if (pendingReq) {
        return res.status(409).json({ error: 'Request already pending', code: 'CLUB_REQUEST_PENDING' });
      }

      const joinRequest = await prisma.$transaction(async (tx) => {
        const jr = await tx.clubJoinRequest.create({
          data: { clubId, userId: uid },
        });

        // Notify owner + moderators
        const modsAndOwner = await tx.discussionGroupMembership.findMany({
          where: {
            groupId: club.serverId,
            leftAt: null,
            isActive: true,
            OR: [
              { userId: club.ownerId ?? -1 },
              { role: 'ADMIN' }, // ADMIN = moderator storage proxy
            ],
          },
          select: { userId: true },
        });

        if (modsAndOwner.length > 0) {
          await tx.discussionNotification.createMany({
            data: modsAndOwner.map((m) => ({
              userId: m.userId,
              groupId: club.serverId,
              type: 'CLUB_JOIN_REQUEST',
              payload: { clubId, requestId: jr.id, applicantUserId: uid },
            })),
          });
        }

        return jr;
      });

      return res.status(201).json({ joinRequest, status: 'PENDING' });
    }

    // OPEN — join immediately
    const result = await prisma.$transaction(async (tx) => {
      // Use 'STUDENT' as the default membership role for new club members.
      // The engine maps STUDENT → MEMBER systemKey for club servers.
      const membership = await tx.discussionGroupMembership.upsert({
        where: { groupId_userId: { groupId: club.serverId, userId: uid } },
        update: {
          role: 'STUDENT',
          canPost: true,
          leftAt: null,
          isActive: true,
        },
        create: {
          groupId: club.serverId,
          userId: uid,
          role: 'STUDENT',
          canPost: true,
        },
      });

      // Bump member count cache
      await tx.club.update({
        where: { id: clubId },
        data: { memberCountCache: { increment: 1 } },
      });

      return membership;
    });

    // Emit socket event for real-time rail update
    try {
      const io = getIo();
      io.to(`user:${uid}`).emit('club:joined', {
        clubId,
        slug: club.slug,
        serverId: club.serverId,
      });
    } catch { /* socket unavailable */ }

    res.status(201).json({ membership: result, status: 'JOINED' });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/leave — self-leave
// ═════════════════════════════════════════════════════════════════════════════

export default router;
