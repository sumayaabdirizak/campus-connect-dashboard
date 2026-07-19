import express from 'express';
import {
  approveClubApplication,
  rejectClubApplication,
} from '../../../features/clubs/club.service.js';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError, formatClubForApi, rejectSchema } from '../shared.js';
import { requireDeanOrSuperAdmin } from '../requireDeanOrSuperAdmin.js';

const router = express.Router();

router.post('/:id/approve', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    // Scope check: dean can only approve clubs in their faculty
    if (req.user.role === 'DEAN' && req.facultyId) {
      const club = await prisma.club.findUnique({ where: { id: clubId }, select: { facultyId: true } });
      if (!club) return res.status(404).json(apiErrorBody('Club not found'));
      if (club.facultyId !== req.facultyId) {
        return res.status(403).json(apiErrorBody('Club is not in your faculty'));
      }
    }

    const result = await approveClubApplication(clubId, uid);

    // Notify via socket if the owner is online
    if (result.club.ownerId) {
      try {
        const io = getIo();
        io.to(`user:${result.club.ownerId}`).emit('club:approved', {
          clubId: result.club.id,
          slug: result.club.slug,
          serverId: result.serverId,
          defaultChannelId: result.defaultChannelId,
        });
      } catch { /* socket unavailable, notification was persisted anyway */ }
    }

    res.json({
      club: result.club,
      serverId: result.serverId,
      defaultChannelId: result.defaultChannelId,
    });
  } catch (err) {
    try { handleServiceError(err, res); } catch { next(err); }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/reject — dean rejects pending club
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/reject', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    const { reason } = rejectSchema.parse(req.body);

    // Scope check
    if (req.user.role === 'DEAN' && req.facultyId) {
      const club = await prisma.club.findUnique({ where: { id: clubId }, select: { facultyId: true } });
      if (!club) return res.status(404).json(apiErrorBody('Club not found'));
      if (club.facultyId !== req.facultyId) {
        return res.status(403).json(apiErrorBody('Club is not in your faculty'));
      }
    }

    const club = await rejectClubApplication(clubId, uid, reason);
    res.json({ club });
  } catch (err) {
    try { handleServiceError(err, res); } catch { next(err); }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/suspend — dean suspends a club
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/suspend', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json(apiErrorBody('Club not found'));
    if (club.status !== 'APPROVED') {
      return res.status(409).json(apiErrorBody(`Cannot suspend club in state ${club.status}`));
    }

    // Scope check for deans
    if (req.user.role === 'DEAN' && req.facultyId && club.facultyId !== req.facultyId) {
      return res.status(403).json(apiErrorBody('Club is not in your faculty'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.club.update({
        where: { id: clubId },
        data: { status: 'SUSPENDED' },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'SUSPEND',
          reason: req.body?.reason ?? null,
        },
      });
      return result;
    });

    res.json({ club: updated });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/join — join (OPEN) or request to join (BY_REQUEST)
// ═════════════════════════════════════════════════════════════════════════════

export default router;
