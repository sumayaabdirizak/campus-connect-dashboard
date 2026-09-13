import type { Quiz } from '@/lib/course-details/services/quizzes-types';
import { serverNow } from '@/lib/server-clock';
import {
  earnedMarksFromPercent,
  formatYourMarksLabel,
  quizTotalMarks
} from '../quiz-marks-display';
import {
  canStudentStartOnlineQuiz,
  formatQuizScheduleLine,
  quizWindowEnd
} from '../quiz-schedule-display';
import { getQuizWindowState } from '../teacher-quiz-card/quiz-window-state';
import { minutesLeft } from './helpers';

export type QuizStatusKey =
  | 'in_progress'
  | 'opens_soon'
  | 'open'
  | 'not_submitted'
  | 'closes_soon'
  | 'submitted'
  | 'graded_pass'
  | 'graded_fail'
  | 'missed'
  | 'closed'
  | 'printed'
  | 'printed_waiting'
  | 'printed_absent'
  | 'printed_cheat'
  | 'not_ready';

export type StatusTone = 'neutral' | 'sky' | 'amber' | 'emerald' | 'rose';

export type QuizDisplayStatus = {
  key: QuizStatusKey;
  label: string;
  tone: StatusTone;
};

export type StudentQuizCardState = {
  status: QuizDisplayStatus;
  windowState: 'scheduled' | 'open' | 'closed' | null;
  scheduleLine: string | null;
  questionCount: number;
  totalMarks: number;
  durationMinutes: number;
  isOffline: boolean;
  isEmpty: boolean;
  inProgress: boolean;
  minutesLeft: number | null;
  canStart: boolean;
  exhausted: boolean;
  hasResults: boolean;
  lastAttemptId: number | null;
  marksLine: string | null;
  accentClass: string;
};

const ACCENT: Record<StatusTone, string> = {
  neutral: 'border-l-muted-foreground/40',
  sky: 'border-l-info',
  amber: 'border-l-warning',
  emerald: 'border-l-success',
  rose: 'border-l-destructive'
};

function closingSoonLabel(quiz: Quiz, now: number): string | null {
  const end = quizWindowEnd(quiz);
  if (!end) {
    if (!quiz.close_at) return null;
    const ms = new Date(quiz.close_at).getTime() - now;
    if (ms <= 0 || ms >= 24 * 60 * 60 * 1000) return null;
    const hours = Math.floor(ms / (60 * 60 * 1000));
    if (hours < 1) return `in ${Math.max(1, Math.floor(ms / 60_000))}m`;
    return `in ${hours}h`;
  }
  const ms = end.getTime() - now;
  if (ms <= 0 || ms >= 24 * 60 * 60 * 1000) return null;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return `in ${Math.max(1, Math.floor(ms / 60_000))}m`;
  return `in ${hours}h`;
}

export function resolveStudentQuizCardState(quiz: Quiz): StudentQuizCardState {
  const now = serverNow();
  const isOffline = quiz.mode === 'offline';
  const inProgressAttempt = quiz.inProgressAttempt ?? null;
  const last = quiz.lastAttempt ?? null;
  const attemptsUsed = quiz.attemptsUsed ?? 0;
  const attemptsLeft =
    quiz.attemptsLeft ?? Math.max(0, quiz.max_attempts - attemptsUsed);
  const exhausted = !inProgressAttempt && attemptsLeft <= 0;
  const questionCount = quiz.questions?.length ?? 0;
  const isEmpty = questionCount === 0;
  const totalMarks = quizTotalMarks(quiz.questions);
  const windowState = isOffline ? null : getQuizWindowState(quiz, now);
  const scheduleLine = formatQuizScheduleLine(quiz, now);
  const ipMinutesLeft = minutesLeft(inProgressAttempt?.expires_at ?? null);
  const lastScorePct = last?.score != null ? Math.round(last.score) : null;
  const offlineGraded = isOffline && last != null && last.score != null && last.closure_reason !== 'cheat';
  const offlineAbsent =
    isOffline && last != null && last.closure_reason === 'absent';
  const offlineCheat =
    isOffline && last != null && last.closure_reason === 'cheat';
  const canStart = canStudentStartOnlineQuiz(quiz, now);
  const closesSoon = closingSoonLabel(quiz, now);

  let marksLine: string | null = null;
  if (inProgressAttempt && ipMinutesLeft != null) {
    marksLine =
      ipMinutesLeft > 0 ? `${ipMinutesLeft} min left` : 'Time is almost up';
  } else if (offlineAbsent) {
    marksLine = 'Marked absent';
  } else if (offlineCheat) {
    marksLine = 'Marked for cheating (0)';
  } else if (lastScorePct != null && totalMarks > 0) {
    const earned = earnedMarksFromPercent(lastScorePct, totalMarks);
    marksLine = formatYourMarksLabel(earned, totalMarks, lastScorePct);
  } else if (lastScorePct != null) {
    marksLine = `Your marks: ${lastScorePct}%`;
  } else if (isOffline) {
    marksLine = 'Printed quiz';
  } else if (totalMarks > 0) {
    marksLine = `${Math.round(totalMarks)} marks total`;
  }

  let status: QuizDisplayStatus;

  if (isEmpty && !isOffline) {
    status = { key: 'not_ready', label: 'Not ready', tone: 'amber' };
  } else if (isOffline) {
    if (offlineCheat) {
      status = { key: 'printed_cheat', label: 'Cheat', tone: 'rose' };
    } else if (offlineGraded && lastScorePct != null) {
      const passed = lastScorePct >= (quiz.passing_score ?? 50);
      status = passed
        ? {
            key: 'graded_pass',
            label:
              totalMarks > 0
                ? formatYourMarksLabel(
                    earnedMarksFromPercent(lastScorePct, totalMarks),
                    totalMarks,
                    lastScorePct
                  ).replace(/^Your marks:\s*/, '')
                : `${lastScorePct}%`,
            tone: 'emerald'
          }
        : {
            key: 'graded_fail',
            label:
              totalMarks > 0
                ? formatYourMarksLabel(
                    earnedMarksFromPercent(lastScorePct, totalMarks),
                    totalMarks,
                    lastScorePct
                  ).replace(/^Your marks:\s*/, '')
                : `${lastScorePct}%`,
            tone: 'rose'
          };
    } else if (offlineAbsent) {
      status = { key: 'printed_absent', label: 'Absent', tone: 'rose' };
    } else if (last?.is_graded) {
      status = { key: 'printed_waiting', label: 'Waiting for marks', tone: 'neutral' };
    } else {
      status = { key: 'printed', label: 'Printed', tone: 'neutral' };
    }
  } else if (inProgressAttempt) {
    status = {
      key: 'in_progress',
      label:
        ipMinutesLeft != null && ipMinutesLeft > 0
          ? `${ipMinutesLeft} min left`
          : 'In progress',
      tone: 'sky'
    };
  } else if (lastScorePct != null) {
    const passed = lastScorePct >= (quiz.passing_score ?? 50);
    const label =
      totalMarks > 0
        ? formatYourMarksLabel(
            earnedMarksFromPercent(lastScorePct, totalMarks),
            totalMarks,
            lastScorePct
          ).replace(/^Your marks:\s*/, '')
        : `${lastScorePct}%`;
    status = passed
      ? { key: 'graded_pass', label, tone: 'emerald' }
      : { key: 'graded_fail', label, tone: 'rose' };
  } else if (last != null && lastScorePct == null) {
    status = { key: 'submitted', label: 'Submitted', tone: 'emerald' };
  } else if (windowState === 'scheduled') {
    status = { key: 'opens_soon', label: 'Opens soon', tone: 'neutral' };
  } else if (windowState === 'closed') {
    // Only mark Missing after the quiz window has closed with no attempt.
    status =
      attemptsUsed === 0
        ? { key: 'missed', label: 'Missing', tone: 'rose' }
        : { key: 'closed', label: 'Closed', tone: 'neutral' };
  } else if (exhausted) {
    status = { key: 'closed', label: 'No attempts left', tone: 'neutral' };
  } else if (closesSoon) {
    status = {
      key: 'closes_soon',
      label: `Not submitted · closes ${closesSoon}`,
      tone: 'amber',
    };
  } else {
    // Open (or no schedule window): not submitted yet — never Missing.
    status = { key: 'not_submitted', label: 'Not submitted', tone: 'sky' };
  }

  return {
    status,
    windowState,
    scheduleLine,
    questionCount,
    totalMarks,
    durationMinutes: quiz.duration_minutes,
    isOffline,
    isEmpty,
    inProgress: !!inProgressAttempt,
    minutesLeft: ipMinutesLeft,
    canStart,
    exhausted,
    hasResults: last != null && (last.score != null || last.is_graded),
    lastAttemptId: last?.id ?? null,
    marksLine,
    accentClass: ACCENT[status.tone]
  };
}

/** Prefer expanding cards the student should act on first. */
export function shouldAutoExpandQuiz(state: StudentQuizCardState): boolean {
  return (
    state.status.key === 'in_progress' ||
    state.status.key === 'closes_soon' ||
    state.status.key === 'not_submitted' ||
    state.status.key === 'open'
  );
}

/** Sort quizzes: actionable first, then upcoming, then done/closed. */
export function sortQuizzesForStudentGrid(quizzes: Quiz[]): Quiz[] {
  const rank = (q: Quiz) => {
    const key = resolveStudentQuizCardState(q).status.key;
    switch (key) {
      case 'in_progress':
        return 0;
      case 'closes_soon':
        return 1;
      case 'open':
      case 'not_submitted':
      case 'not_ready':
        return 2;
      case 'opens_soon':
        return 3;
      case 'submitted':
      case 'graded_pass':
      case 'graded_fail':
      case 'printed':
      case 'printed_waiting':
      case 'printed_absent':
      case 'printed_cheat':
        return 4;
      default:
        return 5;
    }
  };
  return [...quizzes].sort((a, b) => rank(a) - rank(b));
}
