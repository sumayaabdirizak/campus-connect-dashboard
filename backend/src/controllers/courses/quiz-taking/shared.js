/** Shared deadline for fixed mode: Opens + Duration. */
export function fixedWindowEnd(quiz) {
  if (quiz.timing_mode !== 'fixed' || !quiz.open_at) return null;
  const mins = Number(quiz.duration_minutes) || 0;
  return new Date(new Date(quiz.open_at).getTime() + mins * 60_000);
}

/** Cohort window end for reminders / answer-key release. */
export function cohortWindowEnd(quiz) {
  if (quiz.timing_mode === 'fixed') return fixedWindowEnd(quiz);
  return quiz.close_at ? new Date(quiz.close_at) : null;
}

/**
 * When new attempts may start (and when the cohort window is still live).
 * Fixed: open_at … open_at+duration. Flexible: open_at … close_at.
 */
export function quizIsOpen(quiz, now = new Date()) {
  const t = now.getTime();
  if (quiz.open_at && new Date(quiz.open_at).getTime() > t) return false;
  if (quiz.timing_mode === 'fixed') {
    const end = fixedWindowEnd(quiz);
    if (end && end.getTime() < t) return false;
    return true;
  }
  if (quiz.close_at && new Date(quiz.close_at).getTime() < t) return false;
  return true;
}

/** True when the public answer key may be shown to students. */
export function quizAnswerKeyReleased(quiz, now = new Date()) {
  const t = now.getTime();
  if (quiz.timing_mode === 'fixed') {
    const end = fixedWindowEnd(quiz);
    return !!(end && end.getTime() <= t);
  }
  if (quiz.close_at) return new Date(quiz.close_at).getTime() <= t;
  // Flexible with no close: reveal after submit (nothing left to protect).
  return true;
}

export function stripAttemptAnswerKey(attempt) {
  const quiz = attempt.quiz;
  const strippedAnswers = (attempt.answers ?? []).map((a) => ({
    ...a,
    is_correct: null,
    points_earned: null,
  }));
  if (!quiz) return { ...attempt, answers: strippedAnswers };
  return {
    ...attempt,
    answers: strippedAnswers,
    quiz: {
      ...quiz,
      questions: (quiz.questions ?? []).map((q) => {
        const { explanation: _ex, options, ...rest } = q;
        return {
          ...rest,
          explanation: null,
          options: (options ?? []).map(({ is_correct: _ic, ...o }) => o),
        };
      }),
    },
  };
}

/** Student-facing attempt payload — marks and auto-grade are visible after submit. */
export function shapeStudentAttemptReview(attempt) {
  return { ...attempt, answers_revealed: true };
}

export const MAX_WARNINGS = 3;
