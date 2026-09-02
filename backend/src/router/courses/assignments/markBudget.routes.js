import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import { getCourseMarkBudget } from '../../../services/courses/courseMarkBudget.service.js';

const router = Router();

router.get(
  '/:courseOfferingId/mark-budget',
  requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const budget = await getCourseMarkBudget(req.courseOffering.id);
    res.json(budget);
  })
);

export default router;
