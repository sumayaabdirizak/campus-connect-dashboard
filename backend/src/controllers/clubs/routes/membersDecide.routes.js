import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError } from '../shared.js';

const router = express.Router();

router.post('/:id/requests/:reqId/decide', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const reqId = Number(req.params.reqId);
    const uid = userId(req);
    const approve = req.body?.approve === true;
    const reason = req.body?.reason ?? null;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true, slug: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    // Only owner or moderator
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Forbidden'));
    }

    const joinReq = await prisma.clubJoinRequest.findFirst({
      where: { id: reqId, clubId, status: 'PENDING' },
    });
    if (!joinReq) {
      return res.status(404).json(apiErrorBody('Join request not found or already decided'));
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.clubJoinRequest.update({
        where: { id: reqId },
        data: {
          status: approve ? 'APPROVED' : 'REJECTED',
          decidedAt: new Date(),
          decidedByUserId: uid,
          reason,
        },
      });

      if (approve) {
        // Insert membership
        await tx.discussionGroupMembership.upsert({
          where: { groupId_userId: { groupId: club.serverId, userId: joinReq.userId } },
          update: { role: 'STUDENT', canPost: true, leftAt: null, isActive: true },
          create: { groupId: club.serverId, userId: joinReq.userId, role: 'STUDENT', canPost: true },
        });
        await tx.club.update({
          where: { id: clubId },
          data: { memberCountCache: { increment: 1 } },
        });
      }

      // Notify applicant
      await tx.discussionNotification.create({
        data: {
          userId: joinReq.userId,
          groupId: club.serverId,
          type: 'CLUB_JOIN_DECIDED',
          payload: { clubId, slug: club.slug, approved: approve, reason },
        },
      });

      return updated;
    });

    // Socket push
    try {
      const io = getIo();
      io.to(`user:${joinReq.userId}`).emit(approve ? 'club:joined' : 'club:join-rejected', {
        clubId,
        slug: club.slug,
        serverId: club.serverId,
      });
    } catch { /* socket unavailable */ }

    res.json({ request: result });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/clubs/:id — edit club settings (owner or moderator, limited)
// ═════════════════════════════════════════════════════════════════════════════

export default router;
