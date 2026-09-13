import express from 'express';
import crypto from 'crypto';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError, createInviteSchema } from '../../../controllers/clubs/shared.js';

const router = express.Router();

router.get('/:id/invites', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    const ownerId = club.ownerId == null ? null : Number(club.ownerId);
    if (ownerId !== uid) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: {
          groupId: club.serverId,
          userId: uid,
          leftAt: null,
          isActive: true,
          role: { in: ['ADMIN', 'DEAN'] },
        },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Forbidden'));
    }

    const invites = await prisma.clubInvite.findMany({
      where: {
        clubId,
        status: 'PENDING',
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        inviter: { select: { id: true, full_name: true } },
        invitee: { select: { id: true, full_name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      invites: invites.map((inv) => ({
        ...inv,
        inviteUrl: `/dashboard/clubs/invite/${inv.token}`,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DELETE /api/clubs/:id/invites/:inviteId â€” revoke an invite
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

router.delete('/:id/invites/:inviteId', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const inviteId = Number(req.params.inviteId);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    const ownerId = club.ownerId == null ? null : Number(club.ownerId);
    if (ownerId !== uid) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: {
          groupId: club.serverId,
          userId: uid,
          leftAt: null,
          isActive: true,
          role: { in: ['ADMIN', 'DEAN'] },
        },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Forbidden'));
    }

    const invite = await prisma.clubInvite.findFirst({
      where: { id: inviteId, clubId, revokedAt: null },
    });
    if (!invite) {
      return res.status(404).json(apiErrorBody('Invite not found'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.clubInvite.update({
        where: { id: inviteId },
        data: { revokedAt: new Date(), status: 'REVOKED' },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'REVOKE_INVITE',
          payload: { inviteId },
        },
      });
    });

    res.json({ revoked: true });
  } catch (err) {
    next(err);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/clubs/invites/accept â€” accept an invite by token
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default router;

