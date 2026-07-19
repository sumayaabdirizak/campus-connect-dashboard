import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireQuizAttemptManage } from '../../../middleware/courseOfferingRbac.js';
import { gradeAttemptBodySchema } from '../../../validation/quizSchemas.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.patch('/attempts/:attemptId/grade', requireQuizAttemptManage(), validateBody(gradeAttemptBodySchema), asyncHandler(async (req, res) => {
    const attemptId = parseInt(req.params.attemptId, 10);
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers must be an array' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.findUnique({
        where: { id: attemptId },
        include: {
          quiz: { include: { questions: true } },
          answers: { select: { id: true } },
        },
      });
      if (!attempt) return null;

      const ownAnswerIds = new Set(attempt.answers.map((a) => a.id));

      for (const grade of answers) {
        if (typeof grade.points_earned !== 'number') continue;
        if (!ownAnswerIds.has(grade.answerId)) continue;
        await tx.quizAnswer.update({
          where: { id: grade.answerId },
          data: {
            is_correct: !!grade.is_correct,
            points_earned: grade.points_earned,
          },
        });
      }

      const allAnswers = await tx.quizAnswer.findMany({
        where: { attemptId },
        select: { points_earned: true },
      });
      const earned = allAnswers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
      const totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);
      const score = totalPoints > 0 ? (earned / totalPoints) * 100 : 0;

      return tx.quizAttempt.update({
        where: { id: attemptId },
        data: { score, grade: score, is_graded: true },
        include: {
          student: { select: { id: true, full_name: true } },
          answers: true,
        },
      });
    });

    if (!result) return res.status(404).json({ message: 'Attempt not found' });
    res.json(result);
  }));
}
