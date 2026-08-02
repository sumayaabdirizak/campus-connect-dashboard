import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentSubmissionsRead } from '../../../middleware/courseOfferingRbac.js';
import { toSubmissionClient } from '../../../services/assignments/submissionDto.js';

const router = Router();

router.get('/:assignmentId/submissions', requireAssignmentSubmissionsRead(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: parseInt(assignmentId, 10) },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } },
      gradeRow: true,
    },
    orderBy: { submitted_at: 'desc' },
  });

  res.json(submissions.map(toSubmissionClient));
}));

export default router;
