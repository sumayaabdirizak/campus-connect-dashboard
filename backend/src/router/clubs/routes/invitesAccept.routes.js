import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId } from '../../../controllers/clubs/shared.js';

const router = express.Router();

router.post('/invites/accept', async (req, res, next) => {
  try {
    const uid = userId(req);
    const token = String(req.body?.token ?? '').trim();
    if (!token) {
      return res.status(400).json(apiErrorBody('Token is required'));
    }

    const invite = await prisma.clubInvite.findUnique({
      where: { token },
      include: {
        club: {
          select: {
            id: true, slug: true, serverId: true, status: true,
            name: true, ownerId: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found', code: 'INVITE_NOT_FOUND' });
    }
    if (invite.revokedAt) {
      return res.status(410).json({ error: 'This invite has been revoked', code: 'INVITE_REVOKED' });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This invite has expired', code: 'INVITE_EXPIRED' });
    }
    if (invite.status !== 'PENDING') {
      return res.status(410).json({ error: 'This invite is no longer valid', code: 'INVITE_USED' });
    }
    if (!invite.club || invite.club.status !== 'APPROVED' || !invite.club.serverId) {
      return res.status(404).json({ error: 'Club is not available', code: 'CLUB_NOT_AVAILABLE' });
    }
    if (invite.inviteeUserId && invite.inviteeUserId !== uid) {
      return res.status(403).json({ error: 'This invite is for another user', code: 'INVITE_WRONG_USER' });
    }

    const serverId = invite.club.serverId;

    const existing = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: serverId, userId: uid, leftAt: null, isActive: true },
    });
    if (existing) {
      return res.json({
        joined: true,
        alreadyMember: true,
        club: invite.club,
      });
    }

    await prisma.$transaction(async (tx) => {
      if (invite.inviteeUserId) {
        await tx.clubInvite.update({
          where: { id: invite.id },
          data: { usedAt: new Date(), status: 'ACCEPTED' },
        });
      }

      await tx.discussionGroupMembership.upsert({
        where: { groupId_userId: { groupId: serverId, userId: uid } },
        update: {
          role: 'STUDENT',
          canPost: true,
          leftAt: null,
          isActive: true,
        },
        create: {
          groupId: serverId,
          userId: uid,
          role: 'STUDENT',
          canPost: true,
        },
      });

      await tx.club.update({
        where: { id: invite.clubId },
        data: { memberCountCache: { increment: 1 } },
      });
    });

    try {
      const io = getIo();
      io.to(`user:${uid}`).emit('club:joined', {
        clubId: invite.clubId,
        slug: invite.club.slug,
        serverId,
      });
    } catch { /* socket unavailable */ }

    res.json({
      joined: true,
      alreadyMember: false,
      club: invite.club,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
