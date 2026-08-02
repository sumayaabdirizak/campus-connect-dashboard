import express from 'express';
import fs from 'fs';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { uploadRateLimit } from '../../../middleware/perUserRateLimit.js';
import { commitUploadedFile } from '../../../storage/storageOps.js';
import { enforceUploadContentSafety } from '../../courses/resources/helpers.js';
import { userId } from '../shared.js';
import { assertCanManageClub } from '../assertCanManageClub.js';
import { clubBannerUploadMw } from '../clubMediaUpload.js';

const router = express.Router();

async function commitClubImage(req, prefix) {
  const hostBase = `${req.protocol}://${req.get('host')}`;
  const committed = await commitUploadedFile({
    prefix,
    filename: req.file.filename,
    localPath: req.file.path,
    contentType: req.file.mimetype,
    hostBase,
  });
  return committed.url.replace(/^https?:\/\/[^/]+/i, '') || `/uploads/${committed.storageKey}`;
}

/** POST /api/clubs/:id/banner */
router.post('/:id/banner', uploadRateLimit, clubBannerUploadMw, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    if (!Number.isFinite(clubId) || clubId <= 0) {
      return res.status(400).json(apiErrorBody('Invalid club id'));
    }
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const gate = await assertCanManageClub(clubId, uid);
    if (gate.error) {
      fs.unlink(req.file.path, () => {});
      return res.status(gate.error.status).json(gate.error.body);
    }

    const verdict = await enforceUploadContentSafety([req.file]);
    if (!verdict.ok) {
      return res.status(400).json({ message: 'File contents do not match an image. Upload rejected.' });
    }

    let url;
    try {
      url = await commitClubImage(req, 'club-banners');
    } catch (err) {
      fs.unlink(req.file.path, () => {});
      console.error('club banner storage commit failed', err);
      return res.status(500).json({ message: 'Failed to store banner image' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const club = await tx.club.update({
        where: { id: clubId },
        data: { bannerUrl: url },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'EDIT',
          payload: { fields: ['bannerUrl'] },
        },
      });
      return club;
    });

    res.json({ club: updated, bannerUrl: url });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/clubs/:id/banner */
router.delete('/:id/banner', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    if (!Number.isFinite(clubId) || clubId <= 0) {
      return res.status(400).json(apiErrorBody('Invalid club id'));
    }
    const gate = await assertCanManageClub(clubId, uid);
    if (gate.error) return res.status(gate.error.status).json(gate.error.body);

    const updated = await prisma.$transaction(async (tx) => {
      const club = await tx.club.update({
        where: { id: clubId },
        data: { bannerUrl: null },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'EDIT',
          payload: { fields: ['bannerUrl'], cleared: true },
        },
      });
      return club;
    });

    res.json({ club: updated, bannerUrl: null });
  } catch (err) {
    next(err);
  }
});

export default router;
