import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';
import { importToQuizBodySchema } from '../../../validation/questionBankSchemas.js';
import { assertQuizIsDraft } from './shared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:courseOfferingId/import/:quizId', requireQuizManage(),
    validateBody(importToQuizBodySchema),
    asyncHandler(async (req, res) => {
      assertQuizIsDraft(req.quiz);
      const cid = req.courseOffering.id;
      const qid = parseInt(req.params.quizId, 10);
      const { questionIds } = req.body;

      if (req.quiz && req.quiz.courseOfferingId !== cid) {
        return res.status(400).json({ message: 'Quiz does not belong to this offering' });
      }

      const bankQuestions = await prisma.question.findMany({
        where: {
          id: { in: questionIds.map((n) => Number(n)) },
          courseOfferingId: cid,
          is_active: true,
        },
        include: { bankOptions: { orderBy: { order_index: 'asc' } } },
      });

      if (bankQuestions.length === 0) {
        return res.json({ success: true, added: 0 });
      }

      const lastQuestion = await prisma.quizQuestion.findFirst({
        where: { quizId: qid },
        orderBy: { order_index: 'desc' },
        select: { order_index: true },
      });
      let nextOrder = (lastQuestion?.order_index ?? -1) + 1;

      const created = await prisma.$transaction(
        bankQuestions.map((bq) => {
          const order_index = nextOrder++;
          return prisma.quizQuestion.create({
            data: {
              quizId: qid,
              question_text: bq.question_text,
              question_type: bq.question_type,
              points: bq.points,
              order_index,
              options: bq.bankOptions.length
                ? {
                    create: bq.bankOptions.map((opt, idx) => ({
                      option_text: opt.option_text,
                      is_correct: opt.is_correct,
                      order_index: opt.order_index ?? idx,
                    })),
                  }
                : undefined,
            },
            select: { id: true },
          });
        })
      );

      res.json({ success: true, added: created.length });
    })
  );
}
