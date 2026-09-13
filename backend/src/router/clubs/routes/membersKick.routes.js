import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId } from '../../../controllers/clubs/shared.js';

const router = express.Router();

router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) return res.status(404).json(apiErrorBody('Club not found'));

    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const callerMem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!callerMem) return res.status(403).json(apiErrorBody('Forbidden'));
    }

    if (targetUserId === club.ownerId) {
      return res.status(403).json(apiErrorBody('Cannot kick the club owner'));
    }

    if (!isOwner) {
      const targetMem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: targetUserId, leftAt: null, isActive: true },
        select: { role: true },
      });
      if (targetMem?.role === 'ADMIN') {
        return res.status(403).json(apiErrorBody('Moderators cannot kick other moderators'));
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.discussionGroupMembership.updateMany({
        where: { groupId: club.serverId, userId: targetUserId, leftAt: null },
        data: { leftAt: new Date(), isActive: false },
      });
      await tx.club.update({
        where: { id: clubId },
        data: { memberCountCache: { decrement: 1 } },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'REMOVE_MEMBER',
          payload: { targetUserId },
        },
      });
      await tx.discussionNotification.create({
        data: {
          userId: targetUserId,
          groupId: club.serverId,
          type: 'CLUB_REMOVED',
          payload: { clubId },
        },
      });
    });

    try {
      const io = getIo();
      io.to(`user:${targetUserId}`).emit('club:removed', { clubId });
    } catch { /* socket unavailable */ }

    res.json({ removed: true });
  } catch (err) {
    next(err);
  }
});

export default router;
