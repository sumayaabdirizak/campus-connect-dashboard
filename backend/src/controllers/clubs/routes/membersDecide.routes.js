import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { requireClubModerator } from '../clubModeratorAccess.js';

const router = express.Router();

router.post('/:id/requests/:reqId/decide', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const reqId = Number(req.params.reqId);
    const approve = req.body?.approve === true;
    const reason = req.body?.reason ?? null;

    const access = await requireClubModerator(req, clubId, { selectSlug: true });
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }
    const { club, uid } = access;

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
          decideReason: reason,
        },
      });

      if (approve) {
        await tx.discussionGroupMembership.upsert({
          where: { groupId_userId: { groupId: club.serverId, userId: joinReq.userId } },
          update: { role: 'STUDENT', canPost: true, leftAt: null, isActive: true },
          create: {
            groupId: club.serverId,
            userId: joinReq.userId,
            role: 'STUDENT',
            canPost: true,
          },
        });
        await tx.club.update({
          where: { id: clubId },
          data: { memberCountCache: { increment: 1 } },
        });
      }

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

    try {
      const io = getIo();
      io.to(`user:${joinReq.userId}`).emit(approve ? 'club:joined' : 'club:join-rejected', {
        clubId,
        slug: club.slug,
        serverId: club.serverId,
      });
    } catch {
      /* socket unavailable */
    }

    res.json({ request: result });
  } catch (err) {
    next(err);
  }
});

export default router;
