import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.delete(
    '/:courseOfferingId/:questionId', requireCourseOfferingManage(),
    asyncHandler(async (req, res) => {
      const cid = req.courseOffering.id;
      const qid = parseInt(req.params.questionId, 10);

      const existing = await prisma.question.findUnique({
        where: { id: qid },
        select: { courseOfferingId: true },
      });
      if (!existing || existing.courseOfferingId !== cid) {
        return res.status(404).json({ message: 'Question not found in this course' });
      }

      await prisma.question.update({
        where: { id: qid },
        data: { is_active: false },
      });

      res.json({ success: true });
    })
  );
}
