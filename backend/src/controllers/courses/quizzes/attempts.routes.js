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

async function ensureEmptyAnswers(tx, attemptId, questions) {
  if (questions.length === 0) return;
  const existing = await tx.quizAnswer.count({ where: { attemptId } });
  if (existing > 0) return;
  await tx.quizAnswer.createMany({
    data: questions.map((q) => ({
      attemptId,
      questionId: q.id,
      question_type: q.question_type,
    })),
  });
}

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
  // attempt. Upsert a paper result (marks / absent / cheat) so teachers can
  // record and later correct scores from Attempts or the gradebook.
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

      let outcomeData;
      if (absent) {
        outcomeData = {
          submitted_at: new Date(),
          score: null,
          grade: null,
          is_graded: true,
          closure_reason: 'absent',
        };
      } else if (cheat) {
        outcomeData = {
          submitted_at: new Date(),
          score: 0,
          grade: 0,
          is_graded: true,
          closure_reason: 'cheat',
        };
      } else {
        if (marksEarned > totalPoints) {
          return res.status(400).json({
            message: `Marks can't exceed the quiz total (${totalPoints}).`,
          });
        }
        const score = totalPoints > 0 ? (marksEarned / totalPoints) * 100 : 0;
        outcomeData = {
          submitted_at: new Date(),
          score,
          grade: score,
          is_graded: true,
          closure_reason: null,
        };
      }

      const existing = await prisma.quizAttempt.findFirst({
        where: { quizId: quiz.id, studentId },
        select: { id: true },
      });

      const attempt = await prisma.$transaction(async (tx) => {
        if (existing) {
          const updated = await tx.quizAttempt.update({
            where: { id: existing.id },
            data: outcomeData,
            include: ATTEMPT_INCLUDE,
          });
          await ensureEmptyAnswers(tx, updated.id, questions);
          return updated;
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

        return tx.quizAttempt.create({
          data: {
            quizId: quiz.id,
            studentId,
            ...outcomeData,
            answers: emptyAnswers,
          },
          include: ATTEMPT_INCLUDE,
        });
      });

      res.status(existing ? 200 : 201).json(attempt);
    })
  );
}
