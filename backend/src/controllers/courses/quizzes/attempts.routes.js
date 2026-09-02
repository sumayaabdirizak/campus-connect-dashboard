import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';
import { createOfflineAttemptBodySchema } from '../../../validation/quizSchemas.js';
import { resolveQuizAttemptMaxPoints } from './helpers.js';

const ATTEMPT_INCLUDE = {
  student: { select: { id: true, full_name: true, email: true, number: true } },
  answers: { include: { question: true } },
};

/** @param {import('express').Router} router */
export function register(router) {
  router.get('/:quizId/attempts', requireQuizManage(), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: qid },
      include: ATTEMPT_INCLUDE,
      orderBy: { started_at: 'desc' },
    });

    res.json(attempts);
  }));

  // Offline quizzes are printed handouts — students never start an in-app
  // attempt, so there's normally no QuizAttempt row a teacher could grade.
  // This records a paper score for a chosen student in one shot: total
  // marks earned out of the quiz's point total, converted to the same
  // percentage `score`/`grade` every other attempt uses, so it shows up in
  // the gradebook identically. No per-question breakdown — a paper mark is
  // a single number, not per-question detail.
  router.post(
    '/:quizId/attempts/offline',
    requireQuizManage(),
    validateBody(createOfflineAttemptBodySchema),
    asyncHandler(async (req, res) => {
      const quiz = req.quiz;
      const { studentId, marksEarned, absent, cheat } = req.body;

      if (quiz.mode !== 'offline') {
        return res.status(400).json({
          message: 'Only offline quizzes support recording a score this way.',
        });
      }

      const enrolled = await prisma.studentRegistration.findFirst({
        where: { studentId, batchSectionId: quiz.courseOffering.sectionId },
      });
      if (!enrolled) {
        return res.status(400).json({ message: 'That student is not enrolled in this course.' });
      }

      const existing = await prisma.quizAttempt.findFirst({
        where: { quizId: quiz.id, studentId },
      });
      if (existing) {
        return res.status(409).json({
          message: 'This student already has an attempt on this quiz — open it to grade instead.',
        });
      }

      const questions = await prisma.quizQuestion.findMany({
        where: { quizId: quiz.id },
        select: { id: true, question_type: true, points: true },
      });
      const totalPoints = resolveQuizAttemptMaxPoints(quiz, questions);
      if (totalPoints <= 0) {
        return res.status(400).json({
          message: 'Set course marks for this quiz before recording scores.',
        });
      }

      const emptyAnswers =
        questions.length > 0
          ? {
              create: questions.map((q) => ({
                questionId: q.id,
                question_type: q.question_type,
              })),
            }
          : undefined;

      // Absent: no score — row is recorded but gradebook ignores null scores.
      if (absent) {
        const attempt = await prisma.quizAttempt.create({
          data: {
            quizId: quiz.id,
            studentId,
            submitted_at: new Date(),
            is_graded: true,
            closure_reason: 'absent',
            answers: emptyAnswers,
          },
          include: ATTEMPT_INCLUDE,
        });
        return res.status(201).json(attempt);
      }

      // Cheat: zero marks with an explicit reason so teachers/students see it.
      if (cheat) {
        const attempt = await prisma.quizAttempt.create({
          data: {
            quizId: quiz.id,
            studentId,
            submitted_at: new Date(),
            score: 0,
            grade: 0,
            is_graded: true,
            closure_reason: 'cheat',
            answers: emptyAnswers,
          },
          include: ATTEMPT_INCLUDE,
        });
        return res.status(201).json(attempt);
      }

      if (marksEarned > totalPoints) {
        return res.status(400).json({
          message: `Marks can't exceed the quiz total (${totalPoints}).`,
        });
      }
      const score = totalPoints > 0 ? (marksEarned / totalPoints) * 100 : 0;

      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          studentId,
          submitted_at: new Date(),
          score,
          grade: score,
          is_graded: true,
          answers: emptyAnswers,
        },
        include: ATTEMPT_INCLUDE,
      });

      res.status(201).json(attempt);
    })
  );
}
