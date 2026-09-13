/** Duration (minutes) used for attempt timers. */
export function effectiveDurationMinutes(quiz) {
  return quiz.duration_minutes;
}

/**
 * Compute attempt deadline.
 * - flexible: startedAt + duration_minutes
 * - fixed: open_at + duration_minutes (shared cohort clock)
 */
export function computeAttemptExpiresAt(quiz, startedAt = new Date()) {
  const durationMs = effectiveDurationMinutes(quiz) * 60_000;
  if (quiz.timing_mode === 'fixed' && quiz.open_at) {
    return new Date(new Date(quiz.open_at).getTime() + durationMs);
  }
  return new Date(new Date(startedAt).getTime() + durationMs);
}
