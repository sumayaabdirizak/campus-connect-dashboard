import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { shuffle } from "../../utils/shuffle.js";
import { saveAttemptAnswers } from "../../services/quizAttempt.service.js";
import {
  requireCourseOfferingRead,
  requireStudentQuizAccess,
  requireQuizAttemptAccess,
  requireQuizAttemptManage,
} from "../../middleware/courseOfferingRbac.js";
import {
  gradeAttemptBodySchema,
  saveAttemptAnswersBodySchema,
} from "../../validation/quizSchemas.js";

const router = Router();

/// Pure helper: a quiz is "open right now" if neither bound is set, or both
/// bounds bracket `now`. The legacy `timing_mode` branch was identical for
/// fixed vs flexible — collapsed into a single check.
function quizIsOpen(quiz, now = new Date()) {
  if (quiz.open_at && new Date(quiz.open_at) > now) return false;
  if (quiz.close_at && new Date(quiz.close_at) < now) return false;
  return true;
}

// ─── List available quizzes for a student ────────────────────────────────────

router.get('/:courseOfferingId/available', auth, requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const studentId = req.user.id ?? req.user.sub;
  const now = new Date();

  const quizzes = await prisma.quiz.findMany({
    where: {
      courseOfferingId: parseInt(req.params.courseOfferingId, 10),
      is_draft: false,
    },
    include: {
      questions: {
        select: { id: true, question_text: true, question_type: true, points: true, order_index: true }
      },
      // Module summary so the student-side card can show the chapter label.
      // We only surface published modules — a draft chapter shouldn't reveal
      // its title via a quiz that happens to be open.
      module: { select: { id: true, title: true, position: true, publishedAt: true } },
      _count: { select: { attempts: { where: { studentId } } } }
    },
    orderBy: { created_at: 'desc' },
  });

  const available = quizzes.filter((q) => {
    if (q._count.attempts >= q.max_attempts) return false;
    return quizIsOpen(q, now);
  });

  res.json(available);
}));

// ─── Start (or resume) an attempt ────────────────────────────────────────────

router.post('/:quizId/start', auth, requireStudentQuizAccess(), asyncHandler(async (req, res) => {
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

  const existingAttempts = await prisma.quizAttempt.count({
    where: { quizId: qid, studentId }
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

  // Resume an in-progress attempt if one exists, otherwise create a new row.
  // For new attempts we stamp `expires_at = now + effective duration` so a
  // server-side cron can auto-submit if the student vanishes (tab close,
  // network drop, crash). Resuming an existing attempt KEEPS the original
  // deadline — re-opening the page can't extend the timer.
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
    // Legacy in-progress row from before the column existed — back-fill it
    // using its own started_at + duration so the auto-submit cron has a
    // deadline to act on. We don't overwrite an existing deadline.
    const expires_at = new Date(
      new Date(attempt.started_at).getTime() + effectiveDurationMin * 60_000
    );
    attempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { expires_at },
    });
  }

  // Use Fisher-Yates (utils/shuffle.js) instead of the biased
  // `arr.sort(() => Math.random() - 0.5)` — same call site, uniform output.
  const orderedQuestions = quiz.shuffle_questions ? shuffle(quiz.questions) : quiz.questions;

  // Strip `is_correct` from the payload sent to the student. Also shuffle
  // options per-question if enabled.
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

  // Carry over violation counters from any earlier attempts so a serial
  // cheater doesn't get a fresh budget by re-starting.
  const previousAttempts = await prisma.quizAttempt.findMany({
    where: { quizId: qid, studentId },
    select: { violations_count: true, warnings_shown: true }
  });
  const totalViolations = previousAttempts.reduce((sum, a) => sum + (a.violations_count || 0), 0);
  const totalWarnings = previousAttempts.reduce((sum, a) => sum + (a.warnings_shown || 0), 0);

  // Rehydrate the client with any answers already saved on this attempt — on
  // a fresh start this is []; on resume it lets the page restore the exact
  // pre-refresh state. We strip `is_correct` / `points_earned` so a curious
  // student opening devtools can't see correctness mid-attempt.
  const savedAnswerRows = await prisma.quizAnswer.findMany({
    where: { attemptId: attempt.id },
    select: {
      questionId: true,
      selected_option_id: true,
      text_answer: true,
    },
  });

  res.json({
    attempt: {
      id: attempt.id,
      started_at: attempt.started_at,
      // expires_at is the source of truth for the client's countdown — it's
      // a UTC ISO timestamp the client diffs against `Date.now()`, which
      // means small clock skew doesn't matter and a refresh restores the
      // exact same deadline.
      expires_at: attempt.expires_at,
      violations_count: totalViolations,
      warnings_shown: totalWarnings,
    },
    // `serverTime` lets the client correct for clock skew if it wants — we
    // also let the diff method work without it for clients that trust the OS.
    serverTime: new Date(),
    quiz: {
      id: quiz.id,
      title: quiz.title,
      duration_minutes: durationMinutes,
      passing_score: quiz.passing_score,
      timing_mode: quiz.timing_mode,
      open_at: quiz.open_at,
      close_at: quiz.close_at,
    },
    questions: studentQuestions,
    savedAnswers: savedAnswerRows,
    totalQuestions: orderedQuestions.length,
    totalPoints: orderedQuestions.reduce((sum, q) => sum + q.points, 0),
  });
}));

// ─── Autosave answers (student) ──────────────────────────────────────────────
//
// Called every few seconds by the student client while taking a quiz. Body:
//   { answers: [{ questionId, selected_option_id?, text_answer? }, ...] }
//
// Writes the answer rows but does NOT score or finalize them — that happens
// at submit (or by the auto-submit cron at expiry). RBAC ensures only the
// owning student can save, and the service rejects writes after expiry /
// after submit so a stale tab can't clobber an auto-submitted result.
router.put(
  '/attempts/:attemptId/answers',
  auth,
  requireQuizAttemptAccess(),
  validateBody(saveAttemptAnswersBodySchema),
  asyncHandler(async (req, res) => {
    const attemptId = parseInt(req.params.attemptId, 10);
    const studentId = req.user.id ?? req.user.sub;
    if (req.user.role !== 'STUDENT' || req.quizAttempt?.studentId !== studentId) {
      // Teachers/admins also pass the read-level access check, but we don't
      // want them writing student answers. Strict student-owner gate here.
      return res.status(403).json({ message: 'Only the owning student can save answers' });
    }
    try {
      const result = await saveAttemptAnswers({
        attemptId,
        studentId,
        answers: req.body.answers,
      });
      // Echo back a server timestamp so the client can render an accurate
      // "Saved Xs ago" without trusting its own clock too much.
      res.json({ ...result, savedAt: new Date() });
    } catch (err) {
      const status = err.statusCode ?? 500;
      res.status(status).json({ message: err.message ?? 'Failed to save answers' });
    }
  })
);

// ─── View an attempt (owner or teacher) ──────────────────────────────────────

router.get('/attempts/:attemptId', auth, requireQuizAttemptAccess(), asyncHandler(async (req, res) => {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: parseInt(req.params.attemptId, 10) },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true },
            orderBy: { order_index: 'asc' }
          }
        }
      },
      student: { select: { id: true, full_name: true, number: true } },
      answers: true
    },
  });
  if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
  res.json(attempt);
}));

// ─── Manual grading (teacher) ────────────────────────────────────────────────

router.patch('/attempts/:attemptId/grade', auth, requireQuizAttemptManage(), validateBody(gradeAttemptBodySchema), asyncHandler(async (req, res) => {
  const attemptId = parseInt(req.params.attemptId, 10);
  const { answers } = req.body; // [{ answerId, points_earned, is_correct }]
  if (!Array.isArray(answers)) {
    return res.status(400).json({ message: 'answers must be an array' });
  }

  // Apply grades + recompute the overall score atomically. The original
  // implementation read `attempt.quiz.questions` to compute total points but
  // never included `questions` in the lookup — guaranteed null-deref. Now we
  // load the questions explicitly and skip rows whose `answer.id` doesn't
  // belong to this attempt (defensive — RBAC already gated this).
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

    // Sum freshly from DB (don't trust the request body's totals).
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

export default router;
