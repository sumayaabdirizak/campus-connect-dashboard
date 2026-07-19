import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';
import { reorderQuestionsBodySchema } from '../../../validation/quizSchemas.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:quizId/questions/reorder', requireQuizManage(),
    validateBody(reorderQuestionsBodySchema),
    asyncHandler(async (req, res) => {
      const qid = parseInt(req.params.quizId, 10);
      const items = req.body.items;
      const ownIds = new Set(
        (await prisma.quizQuestion.findMany({
          where: { quizId: qid },
          select: { id: true },
        })).map((q) => q.id)
      );
      const safeItems = items.filter((it) => ownIds.has(it.id));

      await prisma.$transaction(
        safeItems.map((it) =>
          prisma.quizQuestion.update({
            where: { id: it.id },
            data: { order_index: it.order_index },
          })
        )
      );
      res.json({ updated: safeItems.length });
    })
  );
}
