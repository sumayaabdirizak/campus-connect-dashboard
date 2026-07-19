import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentSubmissionsRead } from '../../../middleware/courseOfferingRbac.js';

const router = Router();

router.get('/:assignmentId/submissions', requireAssignmentSubmissionsRead(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: parseInt(assignmentId, 10) },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } }
    },
    orderBy: { submitted_at: 'desc' },
  });

  res.json(submissions);
}));

export default router;
