import { format } from 'date-fns';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';

export type StatusFilter = 'all' | 'submitted' | 'in_progress' | 'not_started';

/** Offline paper-quiz filters (outcome-based). */
export type OfflineStatusFilter =
  | 'all'
  | 'recorded'
  | 'absent'
  | 'cheat'
  | 'not_recorded';

export type AttemptRow = {
  studentId: number;
  student: { id: number; full_name: string; number?: string; email?: string };
  attempt: QuizAttempt | null;
};

export function offlineOutcome(
  attempt: QuizAttempt | null
): 'not_recorded' | 'absent' | 'cheat' | 'recorded' {
  if (!attempt) return 'not_recorded';
  if (attempt.closure_reason === 'absent') return 'absent';
  if (attempt.closure_reason === 'cheat') return 'cheat';
  return 'recorded';
}

export function needsGrading(a: QuizAttempt) {
  return (a.answers ?? []).some(
    (ans) => ans.question?.question_type === 'SHORT_ANSWER' && ans.is_correct == null
  );
}

export function buildAttemptRows(
  roster: RosterStudent[],
  attempts: QuizAttempt[]
): AttemptRow[] {
  const attemptByStudent = new Map<number, QuizAttempt>();
  for (const a of attempts) {
    const prev = attemptByStudent.get(a.studentId);
    if (!prev || new Date(a.started_at) > new Date(prev.started_at)) {
      attemptByStudent.set(a.studentId, a);
    }
  }
  return roster.map((rs) => ({
    studentId: rs.id,
    student: {
      id: rs.id,
      full_name: rs.full_name,
      number: rs.number,
      email: rs.email,
    },
    attempt: attemptByStudent.get(rs.id) ?? null,
  }));
}

export function rowStatus(
  row: AttemptRow
): 'submitted' | 'in_progress' | 'not_started' {
  if (!row.attempt) return 'not_started';
  return row.attempt.submitted_at ? 'submitted' : 'in_progress';
}

export function filterAttemptRows(
  rows: AttemptRow[],
  statusFilter: StatusFilter | OfflineStatusFilter,
  search: string,
  isOffline = false
): AttemptRow[] {
  const needle = search.trim().toLowerCase();
  return rows
    .filter((r) => {
      if (statusFilter === 'all') return true;
      if (isOffline) {
        return offlineOutcome(r.attempt) === statusFilter;
      }
      return rowStatus(r) === statusFilter;
    })
    .filter((r) => {
      if (!needle) return true;
      return (
        r.student.full_name.toLowerCase().includes(needle) ||
        (r.student.number ?? '').toLowerCase().includes(needle) ||
        (r.student.email ?? '').toLowerCase().includes(needle)
      );
    });
}

export function statusCounts(rows: AttemptRow[]) {
  return {
    all: rows.length,
    submitted: rows.filter((r) => rowStatus(r) === 'submitted').length,
    in_progress: rows.filter((r) => rowStatus(r) === 'in_progress').length,
    not_started: rows.filter((r) => rowStatus(r) === 'not_started').length,
  };
}

export function offlineStatusCounts(rows: AttemptRow[]) {
  return {
    all: rows.length,
    recorded: rows.filter((r) => offlineOutcome(r.attempt) === 'recorded').length,
    absent: rows.filter((r) => offlineOutcome(r.attempt) === 'absent').length,
    cheat: rows.filter((r) => offlineOutcome(r.attempt) === 'cheat').length,
    not_recorded: rows.filter((r) => offlineOutcome(r.attempt) === 'not_recorded').length,
  };
}

function csvSafe(value: unknown) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadAttemptsCsv(quizTitle: string, allRows: AttemptRow[]) {
  const header = [
    'Student',
    'Student ID',
    'Email',
    'Status',
    'Started At',
    'Submitted At',
    'Marks (%) — latest attempt',
    'Violations',
    'Closure Reason',
  ];
  const rows = allRows.map(({ student, attempt }) => {
    const status = !attempt
      ? 'not_started'
      : attempt.closure_reason === 'absent'
        ? 'absent'
        : attempt.closure_reason === 'cheat'
          ? 'cheat'
          : attempt.submitted_at
            ? 'submitted'
            : 'in_progress';
    return [
      student.full_name,
      student.number ?? '',
      student.email ?? '',
      status,
      attempt?.started_at
        ? format(new Date(attempt.started_at), 'yyyy-MM-dd HH:mm')
        : '',
      attempt?.submitted_at
        ? format(new Date(attempt.submitted_at), 'yyyy-MM-dd HH:mm')
        : '',
      attempt?.score != null ? String(Math.round(attempt.score)) : '',
      attempt?.violations_count != null ? String(attempt.violations_count) : '',
      attempt?.closure_reason ?? '',
    ];
  });
  const csv = [header, ...rows]
    .map((r) => r.map(csvSafe).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quizTitle.replace(/[^a-z0-9]+/gi, '_')}_attempts.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
