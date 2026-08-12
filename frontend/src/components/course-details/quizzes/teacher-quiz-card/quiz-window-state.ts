import type { Quiz } from '@/lib/course-details/services/quizzes-types';

export type QuizWindowState = 'scheduled' | 'open' | 'closed';

export function getQuizWindowState(quiz: Quiz): QuizWindowState | null {
  const now = Date.now();
  const openMs = quiz.open_at ? new Date(quiz.open_at).getTime() : null;
  const closeMs = quiz.close_at ? new Date(quiz.close_at).getTime() : null;
  if (openMs && now < openMs) return 'scheduled';
  if (closeMs && now > closeMs) return 'closed';
  if (openMs || closeMs) return 'open';
  return null;
}
