import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get('/:quizId/attempts', requireQuizManage(), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: qid },
      include: {
        student: { select: { id: true, full_name: true, email: true, number: true } },
        answers: { include: { question: true } }
      },
      orderBy: { started_at: 'desc' },
    });

    res.json(attempts);
  }));
}
