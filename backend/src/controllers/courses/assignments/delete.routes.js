import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';

const router = Router();

router.delete('/:assignmentId', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  await prisma.submission.deleteMany({ where: { assignmentId: parseInt(assignmentId, 10) } });
  await prisma.assignment.delete({ where: { id: parseInt(assignmentId, 10) } });

  res.json({ success: true });
}));

export default router;
