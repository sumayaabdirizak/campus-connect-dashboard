import { format } from 'date-fns';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { serverNow } from '@/lib/server-clock';
import { getQuizWindowState } from './teacher-quiz-card/quiz-window-state';

function fixedWindowEnd(quiz: Quiz): Date | null {
  if (quiz.timing_mode !== 'fixed' || !quiz.open_at) return null;
  const mins = Number(quiz.duration_minutes) || 0;
  return new Date(new Date(quiz.open_at).getTime() + mins * 60_000);
}

/** When the cohort window ends — matches backend quiz-taking shared.js. */
export function quizWindowEnd(quiz: Quiz): Date | null {
  if (quiz.mode === 'offline') return null;
  if (quiz.timing_mode === 'fixed') return fixedWindowEnd(quiz);
  return quiz.close_at ? new Date(quiz.close_at) : null;
}

function formatWhen(d: Date): string {
  return format(d, 'MMM d, h:mm a');
}

/** Short schedule line for student quiz cards. */
export function formatQuizScheduleLine(quiz: Quiz, now = serverNow()): string | null {
  if (quiz.mode === 'offline') return null;

  const state = getQuizWindowState(quiz, now);
  const openAt = quiz.open_at ? new Date(quiz.open_at) : null;
  const endAt = quizWindowEnd(quiz);

  if (state === 'scheduled' && openAt) {
    return `Opens ${formatWhen(openAt)}`;
  }

  if (state === 'closed') {
    if (endAt) return `Closed · ended ${formatWhen(endAt)}`;
    if (quiz.close_at) return `Closed · ended ${formatWhen(new Date(quiz.close_at))}`;
    return 'Closed';
  }

  if (state === 'open') {
    if (quiz.timing_mode === 'fixed' && endAt) {
      if (openAt && now >= openAt.getTime() && now < endAt.getTime()) {
        return `Open now · closes ${formatWhen(endAt)}`;
      }
      if (openAt) {
        return `Everyone starts ${formatWhen(openAt)} · closes ${formatWhen(endAt)}`;
      }
      return `Closes ${formatWhen(endAt)}`;
    }
    if (endAt) return `Open until ${formatWhen(endAt)}`;
    if (openAt) return `Open from ${formatWhen(openAt)}`;
  }

  return null;
}

export function canStudentStartOnlineQuiz(quiz: Quiz, now = serverNow()): boolean {
  if (quiz.mode === 'offline') return false;
  if ((quiz.questions?.length ?? 0) === 0) return false;
  if (quiz.inProgressAttempt) return true;

  const attemptsLeft =
    quiz.attemptsLeft ?? Math.max(0, quiz.max_attempts - (quiz.attemptsUsed ?? 0));
  if (attemptsLeft <= 0) return false;

  const state = getQuizWindowState(quiz, now);
  if (state === 'scheduled' || state === 'closed') return false;
  return true;
}
