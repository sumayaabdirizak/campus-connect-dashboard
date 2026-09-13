import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get('/:quizId/analytics', requireQuizManage(), asyncHandler(async (req, res) => {
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

    const submitted = await prisma.quizAttempt.findMany({
      where: { quizId: qid, submitted_at: { not: null } },
      select: {
        id: true,
        score: true,
        answers: {
          select: {
            questionId: true,
            selected_option_id: true,
            is_correct: true,
          },
        },
      },
    });

    const totalSubmissions = submitted.length;
    const scoredAttempts = submitted.filter((a) => typeof a.score === 'number');
    const avgScore = scoredAttempts.length
      ? Math.round(
          (scoredAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / scoredAttempts.length) * 10
        ) / 10
      : null;

    const byQuestion = new Map();
    for (const a of submitted) {
      for (const ans of a.answers) {
        let bucket = byQuestion.get(ans.questionId);
        if (!bucket) {
          bucket = {
            totalAnswered: 0,
            correctCount: 0,
            pending: 0,
            optionPicks: new Map(),
          };
          byQuestion.set(ans.questionId, bucket);
        }
        bucket.totalAnswered++;
        if (ans.is_correct === true) bucket.correctCount++;
        else if (ans.is_correct === null) bucket.pending++;
        if (ans.selected_option_id != null) {
          bucket.optionPicks.set(
            ans.selected_option_id,
            (bucket.optionPicks.get(ans.selected_option_id) ?? 0) + 1
          );
        }
      }
    }

    const questions = quiz.questions.map((q) => {
      const b = byQuestion.get(q.id) ?? {
        totalAnswered: 0,
        correctCount: 0,
        pending: 0,
        optionPicks: new Map(),
      };
      const graded = b.totalAnswered - b.pending;
      const correctRate = graded > 0 ? Math.round((b.correctCount / graded) * 100) : null;

      const optionStats = q.options.length
        ? q.options.map((o) => {
            const picked = b.optionPicks.get(o.id) ?? 0;
            return {
              optionId: o.id,
              option_text: o.option_text,
              is_correct: o.is_correct,
              pickedCount: picked,
              pickedPct: b.totalAnswered > 0 ? Math.round((picked / b.totalAnswered) * 100) : 0,
            };
          })
        : undefined;

      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: q.order_index,
        totalAnswered: b.totalAnswered,
        correctCount: b.correctCount,
        correctRate,
        pending: b.pending,
        optionStats,
      };
    });

    res.json({ totalSubmissions, avgScore, questions });
  }));
}
