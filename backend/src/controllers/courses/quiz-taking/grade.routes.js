import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireQuizAttemptManage } from '../../../middleware/courseOfferingRbac.js';
import { gradeAttemptBodySchema } from '../../../validation/quizSchemas.js';
import { notifyQuizGraded } from '../quizzes/notifyStudents.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.patch(
    '/attempts/:attemptId/grade',
    requireQuizAttemptManage(),
    validateBody(gradeAttemptBodySchema),
    asyncHandler(async (req, res) => {
      const attemptId = parseInt(req.params.attemptId, 10);
      const { answers } = req.body;
      if (!Array.isArray(answers)) {
        return res.status(400).json({ message: 'answers must be an array' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const attempt = await tx.quizAttempt.findUnique({
          where: { id: attemptId },
          include: {
            quiz: {
              include: {
                questions: true,
                courseOffering: { select: { publicId: true } },
              },
            },
            answers: { select: { id: true, questionId: true } },
          },
        });
        if (!attempt) return null;

        // points_earned is only bounded to [0, 100] at the schema layer —
        // that can't know a question's actual weight. A 5-point question
        // graded at 100 would otherwise pass straight through and inflate
        // the attempt's score past 100%. Clamp per-question here, where the
        // real point value is available.
        const pointsByQuestionId = new Map(
          attempt.quiz.questions.map((q) => [q.id, q.points])
        );
        const questionIdByAnswerId = new Map(
          attempt.answers.map((a) => [a.id, a.questionId])
        );
        for (const grade of answers) {
          if (typeof grade.points_earned !== 'number') continue;
          const questionId = questionIdByAnswerId.get(grade.answerId);
          if (questionId === undefined) continue;
          const maxPoints = pointsByQuestionId.get(questionId) ?? 0;
          const clampedPoints = Math.min(Math.max(grade.points_earned, 0), maxPoints);
          await tx.quizAnswer.update({
            where: { id: grade.answerId },
            data: {
              is_correct: !!grade.is_correct,
              points_earned: clampedPoints,
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

        const updated = await tx.quizAttempt.update({
          where: { id: attemptId },
          data: { score, grade: score, is_graded: true },
          include: {
            student: { select: { id: true, full_name: true } },
            answers: true,
          },
        });
        return { updated, quiz: attempt.quiz, studentId: attempt.studentId };
      });

      if (!result) return res.status(404).json({ message: 'Attempt not found' });

      notifyQuizGraded(result.quiz, result.quiz.courseOffering.publicId, {
        studentId: result.studentId,
        score: result.updated.score,
      });

      res.json(result.updated);
    })
  );
}
