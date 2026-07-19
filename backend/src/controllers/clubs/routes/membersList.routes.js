import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError } from '../shared.js';

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
        user: { select: { id: true, full_name: true, email: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({
      members: members.map((m) => ({
        userId: m.userId,
        user: m.user,
        role: m.role,
        clubRole: m.userId === club.ownerId ? 'OWNER'
          : m.role === 'ADMIN' ? 'MODERATOR'
          : 'MEMBER',
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/:id/requests — list pending join requests (owner / moderator)
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/requests', async (req, res, next) => {
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

    // Check caller is owner or moderator
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) {
        return res.status(403).json(apiErrorBody('Only club owner or moderators can view requests'));
      }
    }

    const requests = await prisma.clubJoinRequest.findMany({
      where: { clubId, status: 'PENDING' },
      include: {
        user: { select: { id: true, full_name: true, email: true, avatarUrl: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/requests/:reqId/decide — approve or reject a join request
// ═════════════════════════════════════════════════════════════════════════════

export default router;
