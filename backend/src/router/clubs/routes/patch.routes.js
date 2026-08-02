import express from 'express';
import {
  createClubApplication,
  createClubAsDean,
  getClubBySlug,
} from '../../../services/clubs/club.service.js';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import {
  userId,
  handleServiceError,
  formatClubForApi,
  createClubSchema,
  editClubSchema,
} from '../../../controllers/clubs/shared.js';

const router = express.Router();

router.patch('/:id', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    const data = editClubSchema.parse(req.body);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, serverId: true, ownerId: true },
    });
    if (!club) return res.status(404).json(apiErrorBody('Club not found'));

    // Only owner can change joinPolicy. Moderators can edit name/tagline/rules/etc.
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Forbidden'));
      // Moderators cannot change joinPolicy
      delete data.joinPolicy;
    }

    // Filter out undefined values
    const updateData = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) updateData[key] = val;
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(apiErrorBody('No fields to update'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.club.update({ where: { id: clubId }, data: updateData });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'EDIT',
          payload: { fields: Object.keys(updateData) },
        },
      });
      // Sync name to DiscussionGroup if changed
      if (updateData.name && club.serverId) {
        await tx.discussionGroup.update({
          where: { id: club.serverId },
          data: { name: updateData.name },
        });
      }
      return result;
    });

    res.json({ club: updated });
  } catch (err) {
    next(err);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/clubs/:id/members/:userId/promote â€” promote â†’ MODERATOR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default router;

