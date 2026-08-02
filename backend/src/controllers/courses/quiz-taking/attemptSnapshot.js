import { shuffle } from '../../../utils/shuffle.js';

/**
 * Build a durable question/option order for an attempt.
 * @returns {{ questionId: number, optionIds: number[] }[]}
 */
export function buildQuestionsSnapshot(quiz) {
  const ordered = quiz.shuffle_questions ? shuffle(quiz.questions) : quiz.questions;
  return ordered.map((q) => {
    const opts = quiz.shuffle_answers ? shuffle(q.options) : q.options;
    return {
      questionId: q.id,
      optionIds: opts.map((o) => o.id),
    };
  });
}

/** Render student-safe question payload from a snapshot + live quiz rows. */
export function materializeFromSnapshot(quiz, snapshot) {
  const byId = new Map(quiz.questions.map((q) => [q.id, q]));
  const questions = [];
  for (const entry of snapshot ?? []) {
    const q = byId.get(entry.questionId);
    if (!q) continue;
    const optById = new Map(q.options.map((o) => [o.id, o]));
    const options = (entry.optionIds ?? [])
      .map((id) => optById.get(id))
      .filter(Boolean)
      .map((o) => ({ id: o.id, option_text: o.option_text }));
    // Append any options added after the attempt started (rare) at the end.
    for (const o of q.options) {
      if (!options.some((x) => x.id === o.id)) {
        options.push({ id: o.id, option_text: o.option_text });
      }
    }
    questions.push({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      order_index: q.order_index,
      options,
    });
  }
  return questions;
}

/** Stable (non-shuffled) fallback for legacy attempts without a snapshot. */
export function materializeNaturalOrder(quiz) {
  return quiz.questions.map((q) => ({
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type,
    points: q.points,
    order_index: q.order_index,
    options: q.options.map((o) => ({ id: o.id, option_text: o.option_text })),
  }));
}
