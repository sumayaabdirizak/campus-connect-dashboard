import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError } from '../../../controllers/clubs/shared.js';

const router = express.Router();

router.post('/:id/members/:userId/promote', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true, slug: true },
    });
    if (!club || !club.serverId) return res.status(404).json(apiErrorBody('Club not found'));
    if (club.ownerId !== uid) {
      return res.status(403).json(apiErrorBody('Only the club owner can promote members'));
    }

    const targetMem = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: club.serverId, userId: targetUserId, leftAt: null, isActive: true },
    });
    if (!targetMem) return res.status(404).json(apiErrorBody('User is not a member'));
    if (targetMem.role === 'ADMIN') {
      return res.status(409).json(apiErrorBody('User is already a moderator'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.discussionGroupMembership.update({
        where: { id: targetMem.id },
        data: { role: 'ADMIN', canModerate: true },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'PROMOTE',
          payload: { targetUserId, from: targetMem.role, to: 'MODERATOR' },
        },
      });
      await tx.discussionNotification.create({
        data: {
          userId: targetUserId,
          groupId: club.serverId,
          type: 'CLUB_PROMOTED',
          payload: { clubId, slug: club.slug, role: 'MODERATOR' },
        },
      });
    });

    // Socket push
    try {
      const io = getIo();
      io.to(`user:${targetUserId}`).emit('club:promoted', {
        clubId,
        slug: club.slug,
        role: 'MODERATOR',
      });
    } catch { /* socket unavailable */ }

    res.json({ promoted: true });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/members/:userId/demote — demote → MEMBER
// ═════════════════════════════════════════════════════════════════════════════

export default router;
