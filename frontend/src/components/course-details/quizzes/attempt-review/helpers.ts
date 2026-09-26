import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';

export function buildAnswersByQuestion(attempt: QuizAttempt) {
  return new Map((attempt.answers ?? []).map((a) => [a.questionId, a]));
}

export function areAnswerKeysHidden(attempt: QuizAttempt): boolean {
  if (attempt.answers_revealed === false) return true;
  if (attempt.answers_revealed === true) return false;
  const answers = attempt.answers ?? [];
  if (answers.length === 0) return false;
  return answers.every((a) => a.is_correct == null && a.points_earned == null);
}

export function computeAttemptStats(attempt: QuizAttempt) {
  const questions = attempt.quiz?.questions ?? [];
  const questionPoints = questions.reduce((s, q) => s + q.points, 0);
  // Printed quizzes may have no in-app questions (teacher records marks only),
  // so fall back to the planned / published total instead of showing 0/0.
  const totalPoints =
    questionPoints > 0
      ? questionPoints
      : (attempt.quiz?.marksPlan?.totalMarks || attempt.quiz?.maxMarks || 0);
  const keysHidden = areAnswerKeysHidden(attempt);
  const answers = attempt.answers ?? [];
  const fromAnswers = answers.reduce((s, a) => s + (a.points_earned ?? 0), 0);
  const hasPerAnswerPoints = answers.some((a) => a.points_earned != null);
  const fromScore =
    attempt.score != null && totalPoints > 0
      ? (attempt.score / 100) * totalPoints
      : null;

  // Offline / total-only marks often have `score` set but no per-answer
  // `points_earned`. Prefer the stored percentage in that case so the banner
  // doesn't show 0/10 while also displaying 90%.
  let earnedPoints = fromAnswers;
  if (fromScore != null && (keysHidden || !hasPerAnswerPoints)) {
    earnedPoints = fromScore;
  }

  const score =
    attempt.score ??
    (totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0);
  const passingScore = attempt.quiz?.passing_score ?? 50;
  return {
    totalPoints,
    earnedPoints,
    score,
    passingScore,
    passed: score >= passingScore,
    keysHidden
  };
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
  if (closureReason === 'absent') {
    return 'You were marked absent for this printed quiz.';
  }
  if (closureReason === 'cheat') {
    return 'Your teacher recorded a cheating outcome for this printed quiz. Marks are zero.';
  }
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
  // Teacher-entered (printed) marks can be stamped with submitted_at just
  // before started_at, which would render "-1m -1s".
  if (elapsedMs <= 0) return null;
  const totalSec = Math.floor(elapsedMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
