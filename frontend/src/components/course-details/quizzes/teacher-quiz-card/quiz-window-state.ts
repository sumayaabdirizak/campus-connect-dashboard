import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { serverNow } from '@/lib/server-clock';

export type QuizWindowState = 'scheduled' | 'open' | 'closed';

/** Same window students use in `quizIsOpen` (backend). */
function fixedWindowEnd(quiz: Quiz): Date | null {
  if (quiz.timing_mode !== 'fixed' || !quiz.open_at) return null;
  const mins = Number(quiz.duration_minutes) || 0;
  return new Date(new Date(quiz.open_at).getTime() + mins * 60_000);
}

export function getQuizWindowState(quiz: Quiz, now = serverNow()): QuizWindowState | null {
  const openMs = quiz.open_at ? new Date(quiz.open_at).getTime() : null;
  const closeMs = quiz.close_at ? new Date(quiz.close_at).getTime() : null;
  const fixedEnd = fixedWindowEnd(quiz);

  if (openMs != null && now < openMs) return 'scheduled';
  if (fixedEnd && now > fixedEnd.getTime()) return 'closed';
  if (closeMs != null && now > closeMs) return 'closed';
  if (openMs != null || closeMs != null) return 'open';
  return null;
}
