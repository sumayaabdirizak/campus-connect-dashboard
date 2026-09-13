import express from 'express';
import crypto from 'crypto';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError, createInviteSchema } from '../../../controllers/clubs/shared.js';

const router = express.Router();

router.post('/:id/invites', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    const { inviteeUserId, expiresInHours } = createInviteSchema.parse(req.body);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, serverId: true, ownerId: true, slug: true, status: true },
    });
    if (!club || !club.serverId || club.status !== 'APPROVED') {
      return res.status(404).json(apiErrorBody('Club not found or not active'));
    }

    // Only owner or moderator
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Only owner or moderators can create invites'));
    }

    // Generate a URL-safe token
    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await prisma.$transaction(async (tx) => {
      const inv = await tx.clubInvite.create({
        data: {
          clubId,
          inviterUserId: uid,
          inviteeUserId: inviteeUserId ?? null,
          token,
          expiresAt,
          status: 'PENDING',
        },
        include: {
          invitee: inviteeUserId ? { select: { id: true, full_name: true } } : false,
        },
      });

      // If direct invite, notify the invitee
      if (inviteeUserId) {
        await tx.discussionNotification.create({
          data: {
            userId: inviteeUserId,
            groupId: club.serverId,
            type: 'CLUB_INVITE',
            payload: {
              clubId,
              slug: club.slug,
              inviteId: inv.id,
              token,
              inviterUserId: uid,
            },
          },
        });

        try {
          const io = getIo();
          io.to(`user:${inviteeUserId}`).emit('club:invited', {
            clubId,
            slug: club.slug,
            token,
          });
        } catch { /* socket unavailable */ }
      }

      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'CREATE',
          payload: {
            kind: inviteeUserId ? 'direct' : 'link',
            inviteId: inv.id,
            inviteeUserId: inviteeUserId ?? null,
          },
        },
      });

      return inv;
    });

    res.status(201).json({
      invite: {
        ...invite,
        inviteUrl: `/dashboard/clubs/invite/${token}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/:id/invites — list active invites
// ═════════════════════════════════════════════════════════════════════════════

export default router;
