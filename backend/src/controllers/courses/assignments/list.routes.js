import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import { attachmentInclude } from './shared.js';

const router = Router();

router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const assignments = await prisma.assignment.findMany({
    where: { courseOfferingId: req.courseOffering.id },
    include: {
      submissions: { select: { id: true, studentId: true, grade: true, is_reviewed: true } },
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
    orderBy: { due_date: 'asc' },
  });

  // Compute pending-grading count per assignment from the embedded
  // submissions array (already in memory — no extra DB round-trip). A
  // submission is "pending" if it hasn't been reviewed yet. Drives the
  // teacher card badge so they can see at a glance which assignments
  // need their attention without drilling in.
  res.json(
    assignments.map((a) => ({
      ...a,
      pendingGradingCount: a.submissions.filter((s) => !s.is_reviewed).length,
    }))
  );
}));

export default router;
