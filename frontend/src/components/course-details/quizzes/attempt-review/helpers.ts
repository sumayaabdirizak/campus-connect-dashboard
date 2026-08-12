import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';

export function buildAnswersByQuestion(attempt: QuizAttempt) {
  return new Map((attempt.answers ?? []).map((a) => [a.questionId, a]));
}

export function computeAttemptStats(attempt: QuizAttempt) {
  const questions = attempt.quiz?.questions ?? [];
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const earnedPoints = (attempt.answers ?? []).reduce(
    (s, a) => s + (a.points_earned ?? 0),
    0
  );
  const score = attempt.score ?? 0;
  const passingScore = attempt.quiz?.passing_score ?? 50;
  return { totalPoints, earnedPoints, score, passingScore, passed: score >= passingScore };
}

export function getClosureBadge(closureReason: string | null) {
  if (!closureReason) return null;
  if (closureReason === 'time_expired')
    return { label: 'Auto-submitted on time-out', tone: 'destructive' as const };
  if (closureReason === 'violations')
    return { label: 'Closed for violations', tone: 'destructive' as const };
  return { label: closureReason, tone: 'secondary' as const };
}

export function getClosureCallout(closureReason: string | null) {
  if (closureReason === 'violations') {
    return 'Your quiz was auto-submitted after you reached the warning limit. Your answers up to that point were saved and graded.';
  }
  if (closureReason === 'time_expired') {
    return 'Time ran out — your quiz was submitted automatically with the answers you had saved.';
  }
  return null;
}

export function formatElapsedLabel(startedAt: string | null, submittedAt: string | null) {
  if (!startedAt || !submittedAt) return null;
  const elapsedMs = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  const totalSec = Math.floor(elapsedMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
