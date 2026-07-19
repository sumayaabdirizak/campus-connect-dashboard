/**
 * Answer scoring logic for quiz attempts.
 *
 * Confidence multiplier table for confidence-based (Cologne / Bristol) scoring.
 * The student declares LOW / MED / HIGH on each objective answer:
 *
 *   correct  + HIGH  →  100% of points (rewards calibration)
 *   correct  + MED   →   75% of points (default if no flag given)
 *   correct  + LOW   →   50% of points (hedging gets partial credit)
 *   wrong    + HIGH  →  -50% of points (penalises overconfidence)
 *   wrong    + MED   →    0
 *   wrong    + LOW   →    0  (no penalty for honest uncertainty)
 */

const CONFIDENCE_MULTIPLIERS = {
  HIGH: { correct: 1.0, wrong: -0.5 },
  MED:  { correct: 0.75, wrong: 0 },
  LOW:  { correct: 0.5, wrong: 0 },
};

export function normalizeConfidence(raw) {
  const v = typeof raw === 'string' ? raw.toUpperCase() : null;
  if (v === 'HIGH' || v === 'MED' || v === 'LOW') return v;
  return 'MED'; // safe default when the field is unset or unknown
}

/**
 * Score a single answer row against its question's canonical correct set.
 * Pure helper — does not write to the DB.
 */
export function scoreAnswer(question, row, { confidenceScoring = false } = {}) {
  if (question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE') {
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
 * Idempotent per (attemptId, questionId).
 */
export async function persistAnswers(tx, { attemptId, questionsById, answers }) {
  for (const answer of answers) {
    const question = questionsById.get(answer.questionId);
    if (!question) continue;

    const existing = await tx.quizAnswer.findFirst({
      where: { attemptId, questionId: question.id },
      select: { id: true },
    });

    const conf = typeof answer.confidence === 'string'
      ? answer.confidence.toUpperCase()
      : null;
    const validConfidence = (conf === 'LOW' || conf === 'MED' || conf === 'HIGH') ? conf : null;

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
