import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';
import { importQuizCsvBodySchema } from '../../../validation/quizSchemas.js';
import { assertQuizIsDraft } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:quizId/import', requireQuizManage(),
    validateBody(importQuizCsvBodySchema),
    asyncHandler(async (req, res) => {
      assertQuizIsDraft(req.quiz);
      const qid = parseInt(req.params.quizId, 10);
      const { questions } = req.body;

      if (questions.length === 0) {
        return res.json({ success: true, imported: 0 });
      }

      const last = await prisma.quizQuestion.findFirst({
        where: { quizId: qid },
        orderBy: { order_index: 'desc' },
        select: { order_index: true },
      });
      let nextOrder = (last?.order_index ?? -1) + 1;

      const created = await prisma.$transaction(
        questions.map((q) => {
          const order_index = nextOrder++;
          return prisma.quizQuestion.create({
            data: {
              quizId: qid,
              question_text: q.question_text,
              question_type: q.question_type,
              points: q.points ?? 1,
              explanation: q.explanation || null,
              order_index,
              options:
                q.question_type === 'SHORT_ANSWER' || !q.options?.length
                  ? undefined
                  : {
                      create: q.options.map((opt, idx) => ({
                        option_text: opt.option_text,
                        is_correct: !!opt.is_correct,
                        order_index: opt.order_index ?? idx,
                      })),
                    },
            },
            select: { id: true },
          });
        })
      );

      res.json({ success: true, imported: created.length });
    })
  );
}
