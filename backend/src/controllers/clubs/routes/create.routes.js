import express from 'express';
import {
  createClubApplication,
  createClubAsDean,
  getClubBySlug,
} from '../../../features/clubs/club.service.js';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import {
  userId,
  handleServiceError,
  formatClubForApi,
  createClubSchema,
  editClubSchema,
} from '../shared.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const uid = userId(req);
    const parsed = createClubSchema.parse(req.body);
    const isDeanMode = req.query.as === 'dean';

    if (isDeanMode) {
      // Path B — dean / super-admin direct create
      if (!['DEAN', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json(apiErrorBody('Only deans and super-admins can create clubs directly'));
      }

      // If dean, resolve their faculty
      let deanFacultyId = parsed.facultyId;
      if (req.user.role === 'DEAN') {
        const deanProfile = await prisma.deanProfile.findUnique({
          where: { userId: uid },
          select: { facultyId: true },
        });
        if (!deanProfile) {
          return res.status(403).json(apiErrorBody('No faculty assignment found for this Dean'));
        }
        // Dean can only create clubs in their own faculty
        if (parsed.scopeKind === 'FACULTY') {
          deanFacultyId = deanProfile.facultyId;
        }
      }

      const result = await createClubAsDean({
        ...parsed,
        ownerId: uid,
        facultyId: deanFacultyId,
      });

      return res.status(201).json({
        club: result.club,
        serverId: result.serverId,
        defaultChannelId: result.defaultChannelId,
      });
    }

    // Path A — student application
    // Auto-resolve student's faculty if not provided
    let facultyId = parsed.facultyId;
    if (parsed.scopeKind === 'FACULTY' && !facultyId) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: uid },
        select: { facultyId: true },
      });
      if (studentProfile?.facultyId) {
        facultyId = studentProfile.facultyId;
      }
    }

    const club = await createClubApplication({
      ...parsed,
      ownerId: uid,
      facultyId,
    });

    res.status(201).json({ club });
  } catch (err) {
    try { handleServiceError(err, res); } catch { next(err); }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/approve — dean approves pending club
// ═════════════════════════════════════════════════════════════════════════════

export default router;
