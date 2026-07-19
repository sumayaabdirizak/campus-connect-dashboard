import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import { quizIsOpen } from './shared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get('/:courseOfferingId/available', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
    const studentId = req.user.id ?? req.user.sub;
    const now = new Date();

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseOfferingId: req.courseOffering.id,
        is_draft: false,
      },
      include: {
        questions: {
          select: { id: true, question_text: true, question_type: true, points: true, order_index: true }
        },
        module: { select: { id: true, title: true, position: true, publishedAt: true } },
        _count: { select: { attempts: { where: { studentId } } } }
      },
      orderBy: { created_at: 'desc' },
    });

    const quizIds = quizzes.map((q) => q.id);
    const inProgress = quizIds.length
      ? await prisma.quizAttempt.findMany({
          where: {
            quizId: { in: quizIds },
            studentId,
            submitted_at: null,
          },
          select: { id: true, quizId: true, started_at: true, expires_at: true },
        })
      : [];
    const inProgressByQuiz = new Map(inProgress.map((a) => [a.quizId, a]));

    const submitted = quizIds.length
      ? await prisma.quizAttempt.findMany({
          where: {
            quizId: { in: quizIds },
            studentId,
            submitted_at: { not: null },
          },
          select: { id: true, quizId: true, score: true, grade: true, submitted_at: true, is_graded: true },
          orderBy: { submitted_at: 'desc' },
        })
      : [];
    const submittedByQuiz = new Map();
    for (const a of submitted) {
      if (!submittedByQuiz.has(a.quizId)) submittedByQuiz.set(a.quizId, []);
      submittedByQuiz.get(a.quizId).push(a);
    }

    const available = quizzes
      .filter((q) => {
        const ip = inProgressByQuiz.get(q.id);
        const hasSubmitted = (submittedByQuiz.get(q.id)?.length ?? 0) > 0;
        if (hasSubmitted) return true;
        if (q._count.attempts >= q.max_attempts && !ip) return false;
        return quizIsOpen(q, now);
      })
      .map((q) => {
        const ip = inProgressByQuiz.get(q.id) ?? null;
        const attemptsUsed = q._count.attempts;
        const attempts = submittedByQuiz.get(q.id) ?? [];
        const last = attempts[0] ?? null;
        const bestScore = attempts.reduce((best, a) => {
          const s = typeof a.score === 'number' ? a.score : null;
          if (s == null) return best;
          return best == null || s > best ? s : best;
        }, null);
        return {
          ...q,
          attemptsUsed,
          attemptsLeft: Math.max(0, q.max_attempts - attemptsUsed),
          inProgressAttempt: ip,
          lastAttempt: last
            ? {
                id: last.id,
                score: last.score,
                submitted_at: last.submitted_at,
                is_graded: last.is_graded ?? false,
                passed:
                  typeof last.score === 'number' ? last.score >= q.passing_score : null,
              }
            : null,
          bestScore,
        };
      });

    res.json(available);
  }));
}
