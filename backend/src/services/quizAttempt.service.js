import { prisma } from "../db/prisma.js";

/**
 * Confidence multiplier table for confidence-based (Cologne / Bristol)
 * scoring. The student declares LOW / MED / HIGH on each objective answer:
 *
 *   correct  + HIGH  →  100% of points (rewards calibration)
 *   correct  + MED   →   75% of points (default if no flag given)
 *   correct  + LOW   →   50% of points (hedging gets partial credit)
 *   wrong    + HIGH  →  -50% of points (penalises overconfidence)
 *   wrong    + MED   →    0
 *   wrong    + LOW   →    0  (no penalty for honest uncertainty)
 *
 * The negative-on-wrong-HIGH is the key behaviour change vs. flat scoring:
 * it discourages guessing AND rewards honest "I'm not sure" answers.
 */
const CONFIDENCE_MULTIPLIERS = {
  HIGH: { correct: 1.0, wrong: -0.5 },
  MED:  { correct: 0.75, wrong: 0 },
  LOW:  { correct: 0.5, wrong: 0 },
};

function normalizeConfidence(raw) {
  const v = typeof raw === "string" ? raw.toUpperCase() : null;
  if (v === "HIGH" || v === "MED" || v === "LOW") return v;
  return "MED"; // safe default when the field is unset or unknown
}

/**
 * Score a single answer row against its question's canonical correct set.
 * Pure helper — does not write to the DB.
 *
 * When `quiz.confidence_scoring` is true, the student's `row.confidence`
 * is mapped through CONFIDENCE_MULTIPLIERS. Otherwise it's classic
 * all-or-nothing scoring (preserves existing quiz behaviour).
 */
function scoreAnswer(question, row, { confidenceScoring = false } = {}) {
  if (question.question_type === "MCQ" || question.question_type === "TRUE_FALSE") {
    const selected = question.options.find((o) => o.id === row.selected_option_id);
    const is_correct = !!selected?.is_correct;
    if (!confidenceScoring) {
      return { is_correct, points_earned: is_correct ? question.points : 0 };
    }
    const conf = normalizeConfidence(row.confidence);
    const mult = is_correct
      ? CONFIDENCE_MULTIPLIERS[conf].correct
      : CONFIDENCE_MULTIPLIERS[conf].wrong;
    return { is_correct, points_earned: question.points * mult };
  }
  // SHORT_ANSWER stays ungraded until a teacher grades manually.
  return { is_correct: null, points_earned: 0 };
}

/**
 * Persist freshly submitted answer rows WITHOUT scoring them. Used by:
 *   - The autosave endpoint (debounced PUT every few seconds while taking).
 *   - The internal phase of `finalizeAttempt` (which immediately scores after).
 *
 * Idempotent per (attemptId, questionId): updates the existing row if one
 * exists, otherwise creates one. This fixes the original `upsert where id=0`
 * bug where every save clobbered QuizAnswer row 0.
 */
async function persistAnswers(tx, { attemptId, questionsById, answers }) {
  for (const answer of answers) {
    const question = questionsById.get(answer.questionId);
    if (!question) continue;

    const existing = await tx.quizAnswer.findFirst({
      where: { attemptId, questionId: question.id },
      select: { id: true },
    });

    // Confidence is optional and only meaningful on confidence-scored
    // quizzes; we accept it on every payload and let the scorer ignore it
    // when the quiz flag is off. Normalize through the same case-insensitive
    // path so a stale client sending lowercase doesn't break.
    const conf = typeof answer.confidence === "string"
      ? answer.confidence.toUpperCase()
      : null;
    const validConfidence = (conf === "LOW" || conf === "MED" || conf === "HIGH") ? conf : null;

    const data = {
      selected_option_id: answer.selected_option_id ?? null,
      text_answer: answer.text_answer ?? null,
      confidence: validConfidence,
    };

    if (existing) {
      await tx.quizAnswer.update({ where: { id: existing.id }, data });
    } else {
      await tx.quizAnswer.create({
        data: {
          attemptId,
          questionId: question.id,
          question_type: question.question_type,
          ...data,
        },
      });
    }
  }
}

/**
 * Save answers without finalizing the attempt — invoked by the autosave PUT
 * endpoint. Verifies ownership + that the attempt is still in progress, then
 * writes the answer rows. No scoring happens here; the student client sees
 * `points_earned: null` for autosaved rows.
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
      const err = new Error("Attempt not found");
      err.statusCode = 404;
      throw err;
    }
    if (Number(attempt.studentId) !== Number(studentId)) {
      const err = new Error("Attempt does not belong to caller");
      err.statusCode = 403;
      throw err;
    }
    if (attempt.submitted_at) {
      const err = new Error("Attempt already submitted");
      err.statusCode = 410;
      throw err;
    }
    if (attempt.expires_at && new Date(attempt.expires_at) <= new Date()) {
      // Past the deadline — the cron will/has finalized this attempt. Reject
      // further writes so a late save can't clobber the auto-submit result.
      const err = new Error("Attempt has expired");
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
 *   1. `POST /api/quizzes/:quizId/submit` — student hits Submit; passes the
 *      latest answers and (optional) violation count.
 *   2. The `autoSubmitExpired` cron — calls with `answers: []` because the
 *      autosave endpoint has been persisting the student's work all along.
 *
 * Behavior:
 *   - Idempotent: if `submitted_at` is already set, return the existing row.
 *   - Re-scores EVERY answer row attached to the attempt against the
 *     canonical correct set on the quiz. This is critical so the cron job
 *     correctly grades autosaved rows it didn't re-send.
 *   - Wrapped in a single transaction.
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
      const err = new Error("Attempt not found");
      err.statusCode = 404;
      throw err;
    }
    if (attempt.submitted_at) {
      // Idempotent — surface the finalized row instead of double-scoring.
      return tx.quizAttempt.findUnique({
        where: { id: attemptId },
        include: {
          student: { select: { id: true, full_name: true } },
          answers: true,
        },
      });
    }

    const questionsById = new Map(attempt.quiz.questions.map((q) => [q.id, q]));

    // Phase 1: persist any answers the caller sent (the student's "submit"
    // payload usually mirrors the latest autosave; cron passes `[]`).
    await persistAnswers(tx, { attemptId, questionsById, answers });

    // Phase 2: re-score every answer row attached to this attempt — including
    // rows the autosave wrote that submit didn't re-send. Without this step,
    // a cron-finalized attempt would score 0 on the autosaved answers since
    // their `points_earned` was never stamped.
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
    // Confidence-scored quizzes can in principle produce a negative total
    // (lots of confidently-wrong answers). Most universities prefer to
    // floor the per-quiz grade at zero so it doesn't drag down the course
    // average — we clamp here.
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
      closureReason ?? (effectiveViolations >= 3 ? "violations" : null);
    const hasShortAnswer = attempt.quiz.questions.some(
      (q) => q.question_type === "SHORT_ANSWER"
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
        // Include the full quiz tree so the submit response is self-contained
        // for the student review screen — they see each question, their
        // answer, the correct option(s), points earned, and the teacher's
        // explanation (if any). All sensitive fields (e.g. is_correct on
        // options) are only revealed AFTER submit, which is exactly the
        // point of this payload.
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
 * Called from the periodic `setInterval` in server.js. The partial index
 * `QuizAttempt(expires_at WHERE submitted_at IS NULL)` keeps this cheap.
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
    take: 200, // cap per tick to keep one bad batch from blocking everything
  });

  let n = 0;
  for (const { id } of expired) {
    try {
      await finalizeAttempt({ attemptId: id, closureReason: "time_expired" });
      n++;
    } catch (err) {
      console.error(`[quiz] auto-submit failed for attempt ${id}:`, err?.message || err);
    }
  }
  return n;
}
