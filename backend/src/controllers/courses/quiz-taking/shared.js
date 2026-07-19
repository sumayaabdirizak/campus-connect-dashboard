/** A quiz is open when neither bound excludes `now`. */
export function quizIsOpen(quiz, now = new Date()) {
  if (quiz.open_at && new Date(quiz.open_at) > now) return false;
  if (quiz.close_at && new Date(quiz.close_at) < now) return false;
  return true;
}

export const MAX_WARNINGS = 3;
