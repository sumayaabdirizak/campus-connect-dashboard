import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentSubmissionsRead } from '../../../middleware/courseOfferingRbac.js';

const router = Router();

router.get('/:assignmentId/extensions', requireAssignmentSubmissionsRead(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const extensions = await prisma.submissionExtension.findMany({
    where: { assignmentId },
    include: {
      student: { select: { id: true, full_name: true, number: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { newDueAt: 'asc' },
  });
  res.json(extensions);
}));

export default router;
