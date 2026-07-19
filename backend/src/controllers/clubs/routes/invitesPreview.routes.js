import express from 'express';
import { prisma } from '../../../db/prisma.js';

const router = express.Router();

router.get('/invites/:token/preview', async (req, res, next) => {
  try {
    const token = String(req.params.token).trim();
    const invite = await prisma.clubInvite.findUnique({
      where: { token },
      include: {
        club: {
          select: {
            id: true, slug: true, name: true, tagline: true,
            bannerUrl: true, iconUrl: true, themeColor: true,
            memberCountCache: true, isOfficial: true, scopeKind: true,
            status: true,
          },
        },
        inviter: { select: { id: true, full_name: true } },
      },
    });

    if (!invite || invite.revokedAt || invite.club?.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Invite not found or expired' });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Invite expired' });
    }

    res.json({
      club: invite.club,
      inviter: invite.inviter,
      token,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
