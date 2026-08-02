import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { userId } from '../shared.js';
import { requireDeanOrSuperAdmin } from '../requireDeanOrSuperAdmin.js';

const router = express.Router();

async function loadClubInScope(req, clubId) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return { error: { status: 404, body: apiErrorBody('Club not found') } };
  if (req.user.role === 'DEAN' && req.facultyId && club.facultyId !== req.facultyId) {
    return { error: { status: 403, body: apiErrorBody('Club is not in your faculty') } };
  }
  return { club };
}

router.post('/:id/suspend', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    const loaded = await loadClubInScope(req, clubId);
    if (loaded.error) return res.status(loaded.error.status).json(loaded.error.body);

    const { club } = loaded;
    if (club.status !== 'APPROVED') {
      return res.status(409).json(apiErrorBody(`Cannot suspend club in state ${club.status}`));
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

router.post('/:id/unsuspend', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    const loaded = await loadClubInScope(req, clubId);
    if (loaded.error) return res.status(loaded.error.status).json(loaded.error.body);

    const { club } = loaded;
    if (club.status !== 'SUSPENDED') {
      return res.status(409).json(apiErrorBody(`Cannot restore club in state ${club.status}`));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.club.update({
        where: { id: clubId },
        data: { status: 'APPROVED' },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'RESTORE',
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

export default router;
