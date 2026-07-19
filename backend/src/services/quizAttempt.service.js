import { prisma } from '../db/prisma.js';
import { scoreAnswer, persistAnswers } from './quizAttemptScoring.js';

/**
 * Save answers without finalizing the attempt — invoked by the autosave PUT
 * endpoint. Verifies ownership + that the attempt is still in progress, then
 * writes the answer rows. No scoring happens here.
 *
 * Returns `{ attempt, savedCount }` so the client can render a "Saved Xs ago".
 */
export async function saveAttemptAnswers({ attemptId, studentId, answers = [] }) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: { select: { id: true, question_type: true } } } } },
    });
    if (!attempt) {
      const err = new Error('Attempt not found');
      err.statusCode = 404;
      throw err;
    }
    if (Number(attempt.studentId) !== Number(studentId)) {
      const err = new Error('Attempt does not belong to caller');
      err.statusCode = 403;
      throw err;
    }
    if (attempt.submitted_at) {
      const err = new Error('Attempt already submitted');
      err.statusCode = 410;
      throw err;
    }
    if (attempt.expires_at && new Date(attempt.expires_at) <= new Date()) {
      const err = new Error('Attempt has expired');
      err.statusCode = 410;
      throw err;
    }

    const questionsById = new Map(attempt.quiz.questions.map((q) => [q.id, q]));
    await persistAnswers(tx, { attemptId, questionsById, answers });
    return { attemptId, savedCount: answers.length };
  });
}

/**
 * Final scoring + close-out for an attempt.
 *
 * Two callers:
 *   1. `POST /api/quizzes/:quizId/submit` — student hits Submit.
 *   2. The `autoSubmitExpired` cron — calls with `answers: []`.
 *
 * Idempotent: if `submitted_at` is already set, return the existing row.
 */
export async function finalizeAttempt({
  attemptId,
  answers = [],
  violationsCount = 0,
  closureReason = null,
}) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { include: { questions: { include: { options: true } } } },
      },
    });
    if (!attempt) {
      const err = new Error('Attempt not found');
      err.statusCode = 404;
      throw err;
    }
    if (attempt.submitted_at) {
      return tx.quizAttempt.findUnique({
        where: { id: attemptId },
        include: {
          student: { select: { id: true, full_name: true } },
          answers: true,
        },
      });
    }

    const questionsById = new Map(attempt.quiz.questions.map((q) => [q.id, q]));

    // Phase 1: persist any answers the caller sent.
    await persistAnswers(tx, { attemptId, questionsById, answers });

    // Phase 2: re-score every answer row attached to this attempt.
    const allRows = await tx.quizAnswer.findMany({ where: { attemptId } });
    let earned = 0;
    const confidenceScoring = !!attempt.quiz.confidence_scoring;
    for (const row of allRows) {
      const q = questionsById.get(row.questionId);
      if (!q) continue;
      const { is_correct, points_earned } = scoreAnswer(q, row, { confidenceScoring });
      if (row.is_correct !== is_correct || row.points_earned !== points_earned) {
        await tx.quizAnswer.update({
          where: { id: row.id },
          data: { is_correct, points_earned },
        });
      }
      earned += points_earned;
    }
    // Clamp to zero for confidence-scored quizzes.
    if (confidenceScoring && earned < 0) earned = 0;

    // Phase 3: stamp the attempt closed.
    const totalPoints = attempt.quiz.questions.reduce((s, q) => s + q.points, 0);
    const score = totalPoints > 0 ? (earned / totalPoints) * 100 : 0;
    const storedViolations = attempt.violations_count ?? 0;
    const effectiveViolations = Math.max(storedViolations, violationsCount ?? 0);
    const storedWarnings = attempt.warnings_shown ?? 0;
    const effectiveWarnings = Math.max(
      storedWarnings,
      effectiveViolations >= 3 ? 3 : effectiveViolations
    );
    const effectiveClosure =
      closureReason ?? (effectiveViolations >= 3 ? 'violations' : null);
    const hasShortAnswer = attempt.quiz.questions.some(
      (q) => q.question_type === 'SHORT_ANSWER'
    );

    return tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        submitted_at: new Date(),
        score,
        grade: score,
        is_graded: !hasShortAnswer,
        closure_reason: effectiveClosure,
        violations_count: effectiveViolations,
        warnings_shown: effectiveWarnings,
      },
      include: {
        student: { select: { id: true, full_name: true } },
        answers: true,
        quiz: {
          include: {
            questions: {
              include: { options: { orderBy: { order_index: 'asc' } } },
              orderBy: { order_index: 'asc' },
            },
          },
        },
      },
    });
  });
}

/**
 * Scan for in-progress attempts whose deadline has passed and finalize each.
 * Called from the periodic `setInterval` in server.js.
 *
 * Returns the number of attempts finalized (for logging).
 */
export async function autoSubmitExpiredAttempts(now = new Date()) {
  const expired = await prisma.quizAttempt.findMany({
    where: {
      submitted_at: null,
      expires_at: { not: null, lte: now },
    },
    select: { id: true },
    take: 200,
  });

  let n = 0;
  for (const { id } of expired) {
    try {
      await finalizeAttempt({ attemptId: id, closureReason: 'time_expired' });
      n++;
    } catch (err) {
      console.error(`[quiz] auto-submit failed for attempt ${id}:`, err?.message || err);
    }
  }
  return n;
}
