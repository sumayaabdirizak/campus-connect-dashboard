import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';
import { buildQuizCsv } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get(
    '/:quizId/export', requireQuizManage(),
    asyncHandler(async (req, res) => {
      const qid = parseInt(req.params.quizId, 10);
      const quiz = await prisma.quiz.findUnique({
        where: { id: qid },
        include: {
          questions: {
            include: { options: { orderBy: { order_index: 'asc' } } },
            orderBy: { order_index: 'asc' },
          },
        },
      });
      if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

      const csv = buildQuizCsv(quiz.questions);
      const slug = (quiz.title || `quiz-${quiz.id}`)
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 60) || `quiz-${quiz.id}`;

      res.json({
        filename: `${slug}.csv`,
        csv,
        questionCount: quiz.questions.length,
      });
    })
  );
}
