import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { userId } from '../shared.js';

const router = express.Router();

router.post('/:id/members/:userId/demote', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) return res.status(404).json(apiErrorBody('Club not found'));
    if (club.ownerId !== uid) {
      return res.status(403).json(apiErrorBody('Only the club owner can demote moderators'));
    }
    if (targetUserId === uid) {
      return res.status(409).json(apiErrorBody('Owner cannot demote themselves'));
    }

    const targetMem = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: club.serverId, userId: targetUserId, leftAt: null, isActive: true },
    });
    if (!targetMem) return res.status(404).json(apiErrorBody('User is not a member'));
    if (targetMem.role !== 'ADMIN') {
      return res.status(409).json(apiErrorBody('User is not a moderator'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.discussionGroupMembership.update({
        where: { id: targetMem.id },
        data: { role: 'STUDENT', canModerate: false },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'DEMOTE',
          payload: { targetUserId },
        },
      });
    });

    res.json({ demoted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
