import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireStudentQuizAccess } from '../../../middleware/courseOfferingRbac.js';
import { emitStarted as emitMonitorStarted } from '../../../socket/quizLiveMonitor.js';
import { quizIsOpen, MAX_WARNINGS } from './shared.js';
import { effectiveDurationMinutes } from './attemptTiming.js';
import { ensureInProgressAttempt, loadLifetimeViolations } from './startAttempt.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:quizId/start', requireStudentQuizAccess(), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    const studentId = req.user.id ?? req.user.sub;
    const now = new Date();

    const quiz = await prisma.quiz.findUnique({
      where: { id: qid },
      include: {
        questions: {
          include: { options: { orderBy: { order_index: 'asc' } } },
          orderBy: { order_index: 'asc' },
        },
      },
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.is_draft) return res.status(400).json({ error: 'Quiz is not published' });

    const submittedCount = await prisma.quizAttempt.count({
      where: { quizId: qid, studentId, submitted_at: { not: null } },
    });
    if (submittedCount >= quiz.max_attempts) {
      return res.status(400).json({ error: 'Maximum attempts reached' });
    }

    if (!quizIsOpen(quiz, now)) {
      if (quiz.open_at && new Date(quiz.open_at) > now) {
        return res.status(400).json({ error: 'Quiz not open yet', open_at: quiz.open_at });
      }
      return res.status(400).json({ error: 'Quiz closed' });
    }

    const { priorViolations, priorWarnings } = await loadLifetimeViolations(qid, studentId);
    const openAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: qid, studentId, submitted_at: null },
      orderBy: { started_at: 'desc' },
    });
    if (!openAttempt && priorViolations >= MAX_WARNINGS) {
      return res.status(400).json({
        error: 'Quiz locked due to integrity violations on previous attempts',
      });
    }

    const ensured = await ensureInProgressAttempt({ quiz, studentId, now, openAttempt });
    if (ensured.error) {
      return res.status(400).json({ error: ensured.error });
    }
    const attempt = ensured.attempt;
    const studentQuestions = ensured.questions;

    const [savedAnswerRows, studentRow] = await Promise.all([
      prisma.quizAnswer.findMany({
        where: { attemptId: attempt.id },
        select: {
          questionId: true,
          selected_option_id: true,
          text_answer: true,
          confidence: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: Number(studentId) },
        select: { id: true, full_name: true, number: true },
      }),
    ]);
    emitMonitorStarted({ quizId: qid, attempt, student: studentRow });

    const openViolations = attempt.violations_count || 0;
    const openWarnings = attempt.warnings_shown || 0;

    res.json({
      attempt: {
        id: attempt.id,
        started_at: attempt.started_at,
        expires_at: attempt.expires_at,
        violations_count: priorViolations + openViolations,
        warnings_shown: priorWarnings + openWarnings,
      },
      serverTime: new Date(),
      quiz: {
        id: quiz.id,
        title: quiz.title,
        duration_minutes: effectiveDurationMinutes(quiz),
        passing_score: quiz.passing_score,
        timing_mode: quiz.timing_mode,
        open_at: quiz.open_at,
        close_at: quiz.close_at,
        confidence_scoring: !!quiz.confidence_scoring,
      },
      questions: studentQuestions,
      savedAnswers: savedAnswerRows,
      totalQuestions: studentQuestions.length,
      totalPoints: studentQuestions.reduce((sum, q) => sum + q.points, 0),
    });
  }));
}
