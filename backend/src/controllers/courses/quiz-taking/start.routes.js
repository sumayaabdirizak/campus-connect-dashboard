import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { shuffle } from '../../../utils/shuffle.js';
import { requireStudentQuizAccess } from '../../../middleware/courseOfferingRbac.js';
import { emitStarted as emitMonitorStarted } from '../../../socket/quizLiveMonitor.js';
import { quizIsOpen } from './shared.js';

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
        }
      }
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.is_draft) return res.status(400).json({ error: 'Quiz is not published' });

    const existingAttempts = await prisma.quizAttempt.count({
      where: { quizId: qid, studentId, submitted_at: { not: null } }
    });
    if (existingAttempts >= quiz.max_attempts) {
      return res.status(400).json({ error: 'Maximum attempts reached' });
    }

    if (!quizIsOpen(quiz, now)) {
      if (quiz.open_at && new Date(quiz.open_at) > now) {
        return res.status(400).json({ error: 'Quiz not open yet', open_at: quiz.open_at });
      }
      return res.status(400).json({ error: 'Quiz closed' });
    }

    const effectiveDurationMin =
      quiz.timing_mode === 'fixed' && quiz.scheduled_duration
        ? quiz.scheduled_duration
        : quiz.duration_minutes;
    let attempt = await prisma.quizAttempt.findFirst({
      where: { quizId: qid, studentId, submitted_at: null },
      orderBy: { started_at: 'desc' }
    });
    if (!attempt) {
      const expires_at = new Date(now.getTime() + effectiveDurationMin * 60_000);
      attempt = await prisma.quizAttempt.create({
        data: { quizId: qid, studentId, expires_at },
      });
    } else if (!attempt.expires_at) {
      const expires_at = new Date(
        new Date(attempt.started_at).getTime() + effectiveDurationMin * 60_000
      );
      attempt = await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: { expires_at },
      });
    }

    const orderedQuestions = quiz.shuffle_questions ? shuffle(quiz.questions) : quiz.questions;
    const studentQuestions = orderedQuestions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      order_index: q.order_index,
      options: (quiz.shuffle_answers ? shuffle(q.options) : q.options).map((o) => ({
        id: o.id,
        option_text: o.option_text,
      })),
    }));

    const durationMinutes = quiz.timing_mode === 'fixed' && quiz.scheduled_duration
      ? quiz.scheduled_duration
      : quiz.duration_minutes;

    const previousAttempts = await prisma.quizAttempt.findMany({
      where: { quizId: qid, studentId },
      select: { violations_count: true, warnings_shown: true }
    });
    const totalViolations = previousAttempts.reduce((sum, a) => sum + (a.violations_count || 0), 0);
    const totalWarnings = previousAttempts.reduce((sum, a) => sum + (a.warnings_shown || 0), 0);

    const savedAnswerRows = await prisma.quizAnswer.findMany({
      where: { attemptId: attempt.id },
      select: {
        questionId: true,
        selected_option_id: true,
        text_answer: true,
        confidence: true,
      },
    });

    const studentRow = await prisma.user.findUnique({
      where: { id: Number(studentId) },
      select: { id: true, full_name: true, number: true },
    });
    emitMonitorStarted({ quizId: qid, attempt, student: studentRow });

    res.json({
      attempt: {
        id: attempt.id,
        started_at: attempt.started_at,
        expires_at: attempt.expires_at,
        violations_count: totalViolations,
        warnings_shown: totalWarnings,
      },
      serverTime: new Date(),
      quiz: {
        id: quiz.id,
        title: quiz.title,
        duration_minutes: durationMinutes,
        passing_score: quiz.passing_score,
        timing_mode: quiz.timing_mode,
        open_at: quiz.open_at,
        close_at: quiz.close_at,
        confidence_scoring: !!quiz.confidence_scoring,
      },
      questions: studentQuestions,
      savedAnswers: savedAnswerRows,
      totalQuestions: orderedQuestions.length,
      totalPoints: orderedQuestions.reduce((sum, q) => sum + q.points, 0),
    });
  }));
}
