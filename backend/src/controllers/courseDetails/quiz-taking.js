import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validateRequest.js";
import { shuffle } from "../../utils/shuffle.js";
import { finalizeAttempt, saveAttemptAnswers } from "../../services/quizAttempt.service.js";
import {
  emitStarted as emitMonitorStarted,
  emitAnswerSaved as emitMonitorAnswerSaved,
  emitViolation as emitMonitorViolation,
  emitSubmitted as emitMonitorSubmitted,
} from "../../socket/quizLiveMonitor.js";
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
import { quizViolationRateLimit } from "../../middleware/perUserRateLimit.js";

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

  // For "Continue" UX: surface the in-progress attempt (if any) so the
  // student card can swap "Start" for "Continue (12 min left)" without an
  // extra round-trip per quiz. We treat an attempt as in-progress iff it has
  // no submitted_at — server cron auto-submits on expiry so a row with
  // expires_at in the past will still have submitted_at set.
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

  // For "previous attempt" UX: pull every submitted attempt the student has
  // on these quizzes so we can surface (a) their most recent score and
  // (b) their best score so far. One query — group server-side in JS.
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
  // Group by quizId. First entry is the most recent (orderBy desc).
  const submittedByQuiz = new Map();
  for (const a of submitted) {
    if (!submittedByQuiz.has(a.quizId)) submittedByQuiz.set(a.quizId, []);
    submittedByQuiz.get(a.quizId).push(a);
  }

  const available = quizzes
    .filter((q) => {
      const ip = inProgressByQuiz.get(q.id);
      const hasSubmitted = (submittedByQuiz.get(q.id)?.length ?? 0) > 0;
      // Always keep quizzes the student has already submitted — they remain
      // reviewable (results + per-question breakdown) even after the window
      // closes or attempts are exhausted. Previously we hid every exhausted
      // quiz, which made single-attempt quizzes vanish the moment a student
      // submitted, leaving no way to re-open their results.
      if (hasSubmitted) return true;
      // Otherwise this is a quiz they haven't finished: hide it if exhausted
      // with no in-progress row to resume, and only show it while open.
      if (q._count.attempts >= q.max_attempts && !ip) return false;
      return quizIsOpen(q, now);
    })
    .map((q) => {
      const ip = inProgressByQuiz.get(q.id) ?? null;
      const attemptsUsed = q._count.attempts;
      const attempts = submittedByQuiz.get(q.id) ?? [];
      const last = attempts[0] ?? null;
      // Best by score. NB: we only include rows where score is set so
      // ungraded short-answer attempts don't pollute the running best.
      const bestScore = attempts.reduce((best, a) => {
        const s = typeof a.score === 'number' ? a.score : null;
        if (s == null) return best;
        return best == null || s > best ? s : best;
      }, null);
      return {
        ...q,
        // `attemptsUsed` includes the in-progress row (it has a row in
        // QuizAttempt). `attemptsLeft` is what the student still has after
        // any in-progress one resolves. Both fields are convenience surfaces
        // the frontend uses for the "Attempt N of M" badge.
        attemptsUsed,
        attemptsLeft: Math.max(0, q.max_attempts - attemptsUsed),
        inProgressAttempt: ip,
        // `lastAttempt` is the most recent SUBMITTED attempt (never the
        // in-progress row). Lets the card show "Last: 72%" without exposing
        // the entire attempt history.
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

  // Only count SUBMITTED attempts toward the max. An in-progress row isn't
  // a consumed attempt until submitted — counting it would block the student
  // from resuming their own current attempt (e.g. max_attempts=1, 1 in-flight
  // row → count=1 >= 1 → erroneously returns 400 instead of resuming).
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
      // Include confidence so a resumed attempt restores the student's
      // previous LOW/MED/HIGH selections — they shouldn't have to re-pick.
      confidence: true,
    },
  });

  // Live-monitor signal: tell any teacher subscribed to this quiz that the
  // student just opened it. We resolve their display name here so the tile
  // can render immediately without a separate user lookup on the teacher side.
  const studentRow = await prisma.user.findUnique({
    where: { id: Number(studentId) },
    select: { id: true, full_name: true, number: true },
  });
  emitMonitorStarted({ quizId: qid, attempt, student: studentRow });

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
      // Echoed so the client knows whether to render the confidence selector
      // below each MCQ / T-F option. Default false when the column is null.
      confidence_scoring: !!quiz.confidence_scoring,
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

      // Live-monitor signal: emit answeredCount to any teacher subscribed.
      // We fire-and-forget here so a slow socket doesn't delay the autosave
      // response. The req.quizAttempt was loaded by RBAC middleware so the
      // quizId is already on hand.
      try {
        const quizId = req.quizAttempt?.quizId;
        if (quizId) {
          // Count distinct answered questions on this attempt — drives the
          // "answered N/M" pill on the teacher's monitoring tile.
          const answeredCount = await prisma.quizAnswer.count({
            where: {
              attemptId,
              OR: [
                { selected_option_id: { not: null } },
                { text_answer: { not: null, notIn: [""] } },
              ],
            },
          });
          // The student's currently-active question is approximated by the
          // last questionId in the saved payload (their most recent edit).
          const lastAnswer = Array.isArray(req.body.answers) && req.body.answers.length > 0
            ? req.body.answers[req.body.answers.length - 1]
            : null;
          emitMonitorAnswerSaved({
            quizId,
            attemptId,
            studentId,
            answeredCount,
            currentQuestionId: lastAnswer?.questionId ?? null,
          });
        }
      } catch (e) {
        // Never let monitor emission disrupt the autosave success path.
        console.warn("[quiz-monitor] emit on answer save failed:", e.message);
      }
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
  // This payload includes the canonical correct options (`is_correct`) and the
  // teacher's explanations. That's fine for a finished attempt (we reveal
  // answers on submit anyway) but it would let a student GET their OWN
  // in-progress attempt to read the answer key mid-quiz. Teachers/graders may
  // inspect in-progress attempts; students may only review submitted ones.
  if (req.user?.role === 'STUDENT' && !attempt.submitted_at) {
    return res.status(403).json({ message: 'Attempt not yet submitted' });
  }
  res.json(attempt);
}));

// ─── Report a violation (student) ────────────────────────────────────────────
//
// Called by the student client whenever the in-quiz code detects a cheating
// signal (tab visibility change, copy/paste, etc.). Increments the row's
// `violations_count` by 1 and echoes the new count back so the client can
// sync its UI without computing locally. When the count crosses the 3-warning
// threshold the same endpoint finalizes the attempt with
// `closure_reason: 'violations'` — the client sees `auto_closed: true` in
// the response and renders the "Session Closed" modal + redirects.
//
// Body: { kind?: string }  — short label like "visibility" / "copy" / "paste",
// purely informational (logged server-side, not persisted to the row yet).
//
// Idempotency: if the attempt is already submitted, the endpoint returns the
// current state without re-incrementing. That keeps "fire-and-forget" client
// calls safe even if the server-side cron auto-submitted on a parallel tick.

const MAX_WARNINGS = 3;

router.post('/attempts/:attemptId/violation', auth, quizViolationRateLimit, requireQuizAttemptAccess(), asyncHandler(async (req, res) => {
  const attemptId = parseInt(req.params.attemptId, 10);
  const studentId = req.user.id ?? req.user.sub;
  const kind = typeof req.body?.kind === 'string' ? req.body.kind.slice(0, 32) : 'unknown';

  // Only the owning student can report on their own attempt — teachers
  // shouldn't be incrementing this counter manually (would corrupt analytics).
  if (req.user.role !== 'STUDENT' || req.quizAttempt?.studentId !== studentId) {
    return res.status(403).json({ message: 'Only the owning student can report violations' });
  }

  const current = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, submitted_at: true, violations_count: true, warnings_shown: true }
  });
  if (!current) return res.status(404).json({ message: 'Attempt not found' });

  // Idempotent: if the attempt is already finalized, surface state without
  // changing anything. The client may receive this if the auto-submit cron
  // closed the row a moment before the violation POST hit the server.
  if (current.submitted_at) {
    return res.json({
      violations_count: current.violations_count,
      warnings_shown: current.warnings_shown,
      auto_closed: true,
      max_warnings: MAX_WARNINGS,
    });
  }

  const nextCount = (current.violations_count ?? 0) + 1;
  const shouldClose = nextCount >= MAX_WARNINGS;

  const quizIdForMonitor = req.quizAttempt?.quizId;

  if (shouldClose) {
    // Hit the limit — finalize the attempt with the violations closure
    // reason. `finalizeAttempt` re-scores from autosaved rows so the
    // student's most recent answers are preserved.
    const finalized = await finalizeAttempt({
      attemptId,
      violationsCount: nextCount,
      closureReason: 'violations',
    });
    console.log(`[quiz] auto-closed attempt ${attemptId} for student ${studentId} after ${nextCount} violations (last: ${kind})`);

    // Live-monitor: emit BOTH a violation event (so the running counter on
    // the tile bumps to N) AND a submitted event (so the tile flips to
    // "auto-closed" status). Order matters — the violation tells the
    // teacher what just happened; submitted is the consequence.
    if (quizIdForMonitor) {
      emitMonitorViolation({
        quizId: quizIdForMonitor,
        attemptId, studentId,
        violations_count: nextCount,
        kind, auto_closed: true,
      });
      if (finalized) {
        emitMonitorSubmitted({
          quizId: quizIdForMonitor,
          attempt: finalized,
          closureReason: 'violations',
        });
      }
    }

    return res.json({
      violations_count: nextCount,
      warnings_shown: MAX_WARNINGS,
      auto_closed: true,
      max_warnings: MAX_WARNINGS,
    });
  }

  // Below threshold — bump counters and return.
  const updated = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      violations_count: nextCount,
      warnings_shown: nextCount,
    },
    select: { violations_count: true, warnings_shown: true },
  });

  // Live-monitor: bump the tile's violation badge.
  if (quizIdForMonitor) {
    emitMonitorViolation({
      quizId: quizIdForMonitor,
      attemptId, studentId,
      violations_count: updated.violations_count,
      kind, auto_closed: false,
    });
  }

  res.json({
    violations_count: updated.violations_count,
    warnings_shown: updated.warnings_shown,
    auto_closed: false,
    max_warnings: MAX_WARNINGS,
  });
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
