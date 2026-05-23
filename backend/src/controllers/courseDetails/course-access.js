import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

/// Upsert the caller's last-seen timestamp for this course offering.
router.post('/:courseOfferingId/ping', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  if (!Number.isInteger(courseOfferingId)) {
    return res.status(400).json({ message: 'Invalid courseOfferingId' });
  }

  const userId = req.user.id;
  const now = new Date();

  const access = await prisma.courseOfferingAccess.upsert({
    where: { userId_courseOfferingId: { userId, courseOfferingId } },
    create: { userId, courseOfferingId, lastSeenAt: now },
    update: { lastSeenAt: now },
  });

  res.json({ lastSeenAt: access.lastSeenAt });
}));

/// Return last-seen timestamps for every student in this offering.
/// Used by the Roster tab's "Last seen" column.
router.get('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  if (!Number.isInteger(courseOfferingId)) {
    return res.status(400).json({ message: 'Invalid courseOfferingId' });
  }

  const rows = await prisma.courseOfferingAccess.findMany({
    where: { courseOfferingId },
    select: { userId: true, lastSeenAt: true },
  });

  res.json(rows);
}));

export default router;
