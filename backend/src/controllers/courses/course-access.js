import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../middleware/courseOfferingRbac.js';

const router = Router();

/// Upsert the caller's last-seen timestamp for this course offering.
router.post(
  '/:courseOfferingId/ping', requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const userId = Number(req.user.id ?? req.user.sub);
    const now = new Date();

    const access = await prisma.courseOfferingAccess.upsert({
      where: { userId_courseOfferingId: { userId, courseOfferingId } },
      create: { userId, courseOfferingId, lastSeenAt: now },
      update: { lastSeenAt: now },
    });

    res.json({ lastSeenAt: access.lastSeenAt });
  }),
);

/// Return last-seen timestamps for every student in this offering.
/// Used by the Roster tab's "Last seen" column.
router.get(
  '/:courseOfferingId', requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;

    const rows = await prisma.courseOfferingAccess.findMany({
      where: { courseOfferingId },
      select: { userId: true, lastSeenAt: true },
    });

    res.json(rows);
  }),
);

export default router;
