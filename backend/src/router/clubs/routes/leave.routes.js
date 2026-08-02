import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError, formatClubForApi } from '../../../controllers/clubs/shared.js';

const router = express.Router();

router.post('/:id/leave', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    // Owner must transfer ownership first
    if (club.ownerId === uid) {
      return res.status(409).json({
        error: 'Club owner must transfer ownership before leaving',
        code: 'CLUB_OWNER_CANNOT_LEAVE',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.discussionGroupMembership.updateMany({
        where: { groupId: club.serverId, userId: uid, leftAt: null },
        data: { leftAt: new Date(), isActive: false },
      });
      await tx.club.update({
        where: { id: clubId },
        data: { memberCountCache: { decrement: 1 } },
      });
    });

    res.json({ left: true });
  } catch (err) {
    next(err);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/clubs/:id/members â€” list members
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default router;

