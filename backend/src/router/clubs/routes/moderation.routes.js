import express from 'express';
import {
  approveClubApplication,
  rejectClubApplication,
} from '../../../services/clubs/club.service.js';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { userId, handleServiceError, rejectSchema } from '../../../controllers/clubs/shared.js';
import { requireDeanOrSuperAdmin } from '../../../controllers/clubs/requireDeanOrSuperAdmin.js';

const router = express.Router();

router.post('/:id/approve', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    // Scope check: a dean is restricted to FACULTY-scoped clubs in their own
    // faculty. UNIVERSITY/CROSS clubs have no facultyId at all — comparing
    // against club.facultyId unconditionally would 403 every dean out of
    // approving them, even after the pending list was fixed to show them.
    if (req.user.role === 'DEAN' && req.facultyId) {
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { facultyId: true, scopeKind: true },
      });
      if (!club) return res.status(404).json(apiErrorBody('Club not found'));
      if (club.scopeKind === 'FACULTY' && club.facultyId !== req.facultyId) {
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

    // Scope check — see the matching comment in POST /:id/approve above.
    if (req.user.role === 'DEAN' && req.facultyId) {
      const target = await prisma.club.findUnique({
        where: { id: clubId },
        select: { facultyId: true, scopeKind: true },
      });
      if (!target) return res.status(404).json(apiErrorBody('Club not found'));
      if (target.scopeKind === 'FACULTY' && target.facultyId !== req.facultyId) {
        return res.status(403).json(apiErrorBody('Club is not in your faculty'));
      }
    }

    const club = await rejectClubApplication(clubId, uid, reason);
    res.json({ club });
  } catch (err) {
    try { handleServiceError(err, res); } catch { next(err); }
  }
});

export default router;
