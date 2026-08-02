import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { requireClubModerator } from '../../../controllers/clubs/clubModeratorAccess.js';

const router = express.Router();

router.get('/:id/members', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    const members = await prisma.discussionGroupMembership.findMany({
      where: { groupId: club.serverId, leftAt: null, isActive: true },
      include: {
        user: { select: { id: true, full_name: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const ownerId = club.ownerId == null ? null : Number(club.ownerId);
    res.json({
      members: members.map((m) => ({
        userId: m.userId,
        user: { ...m.user, avatarUrl: null },
        role: m.role,
        clubRole:
          Number(m.userId) === ownerId
            ? 'OWNER'
            : m.role === 'ADMIN' || m.role === 'DEAN'
              ? 'MODERATOR'
              : 'MEMBER',
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/requests', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const access = await requireClubModerator(req, clubId);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    const rows = await prisma.clubJoinRequest.findMany({
      where: { clubId, status: 'PENDING' },
      include: {
        user: { select: { id: true, full_name: true, email: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });

    res.json({
      requests: rows.map((r) => ({
        ...r,
        user: r.user ? { ...r.user, avatarUrl: null } : r.user,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
