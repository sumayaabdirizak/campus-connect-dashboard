import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';

const router = Router();

router.delete('/:assignmentId/extensions/:extensionId', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.extensionId, 10);
  await prisma.submissionExtension.delete({ where: { id } });
  res.json({ success: true });
}));

export default router;
