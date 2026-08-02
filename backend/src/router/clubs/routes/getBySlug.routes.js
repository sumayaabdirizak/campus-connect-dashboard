import express from 'express';
import {
  createClubApplication,
  createClubAsDean,
  getClubBySlug,
} from '../../../services/clubs/club.service.js';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import {
  userId,
  handleServiceError,
  formatClubForApi,
  createClubSchema,
  editClubSchema,
} from '../../../controllers/clubs/shared.js';
import { attachViewerJoinState } from '../../../controllers/clubs/viewerJoinState.js';

const router = express.Router();

router.get('/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug).trim().toLowerCase();
    const uid = userId(req);

    const club = await getClubBySlug(slug, {
      includePending: true,
      viewerUserId: uid,
    });
    if (!club) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    // Check if the viewer is a member
    let membership = null;
    if (club.serverId) {
      membership = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true },
        select: { role: true },
      });
    }

    const [formatted] = await attachViewerJoinState([formatClubForApi(club)], uid);

    const ownerId = club.ownerId == null ? null : Number(club.ownerId);
    res.json({
      club: formatted,
      isMember: !!membership,
      isOwner: ownerId != null && ownerId === uid,
      membershipRole: membership?.role ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs — Path A (student) or Path B (dean, with ?as=dean)
// ═════════════════════════════════════════════════════════════════════════════

export default router;
