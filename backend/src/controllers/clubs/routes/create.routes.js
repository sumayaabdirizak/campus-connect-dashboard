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
      if (!['DEAN', 'SUPER_ADMIN', 'ACADEMIC_OFFICE'].includes(req.user.role)) {
        return res.status(403).json(apiErrorBody('Only deans and academic leadership can create clubs directly'));
      }

      // If dean, resolve their faculty. Cross-faculty admins must pick faculty for FACULTY scope.
      let deanFacultyId = parsed.facultyId;
      if (req.user.role === 'DEAN') {
        const deanProfile = await prisma.deanProfile.findUnique({
          where: { userId: uid },
          select: { facultyId: true },
        });
        if (!deanProfile) {
          return res.status(403).json(apiErrorBody('No faculty assignment found for this Dean'));
        }
        // Dean can only create faculty clubs in their own faculty
        if (parsed.scopeKind === 'FACULTY') {
          deanFacultyId = deanProfile.facultyId;
        }
      } else if (parsed.scopeKind === 'FACULTY' && !deanFacultyId) {
        return res.status(400).json(
          apiErrorBody('Select a faculty for faculty-scoped clubs, or use University scope.')
        );
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

    // Path A — student / teacher application
    // Auto-resolve faculty if not provided
    let facultyId = parsed.facultyId;
    if (parsed.scopeKind === 'FACULTY' && !facultyId) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: uid },
        select: { facultyId: true },
      });
      if (studentProfile?.facultyId) {
        facultyId = studentProfile.facultyId;
      } else {
        const lecturer = await prisma.lecturerProfile.findUnique({
          where: { userId: uid },
          select: { department: { select: { facultyId: true } } },
        });
        if (lecturer?.department?.facultyId) {
          facultyId = lecturer.department.facultyId;
        }
      }
    }

    if (parsed.scopeKind === 'FACULTY' && !facultyId) {
      return res.status(400).json(
        apiErrorBody('Faculty is required for faculty-scoped clubs. Your account has no faculty assigned.')
      );
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
