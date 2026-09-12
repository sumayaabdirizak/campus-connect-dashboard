import type { AttemptRow } from './helpers';
import { rowStatus } from './helpers';

export const ONLINE_ATTEMPT_COLUMN_OPTS = [
  { id: 'student', label: 'Student' },
  { id: 'started', label: 'Started' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'status', label: 'Status' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'marks', label: 'Marks' }
] as const;

export const OFFLINE_ATTEMPT_COLUMN_OPTS = [
  { id: 'student', label: 'Student' },
  { id: 'status', label: 'Status' },
  { id: 'marks', label: 'Record result' }
] as const;

export const ATTEMPT_SORT_OPTS = [
  { id: 'name-asc', label: 'Name A–Z' },
  { id: 'name-desc', label: 'Name Z–A' },
  { id: 'submitted-desc', label: 'Submitted (newest)' },
  { id: 'submitted-asc', label: 'Submitted (oldest)' },
  { id: 'marks-desc', label: 'Marks (high–low)' },
  { id: 'marks-asc', label: 'Marks (low–high)' },
  { id: 'status-asc', label: 'Status' }
];

export const ONLINE_ATTEMPT_ALL_COLS = ONLINE_ATTEMPT_COLUMN_OPTS.map((c) => c.id);
export const OFFLINE_ATTEMPT_ALL_COLS = OFFLINE_ATTEMPT_COLUMN_OPTS.map((c) => c.id);

export const headerBlack = '!text-[#101828]';

function statusRank(row: AttemptRow, quizClosed?: boolean) {
  const status = rowStatus(row, { quizClosed });
  if (row.attempt?.closure_reason === 'cheat') return -1;
  if (row.attempt?.closure_reason === 'absent') return -0.5;
  if (status === 'in_progress') return 0;
  if (status === 'submitted') return 1;
  if (status === 'missed') return 2;
  return 3;
}

export function sortAttemptRows(
  rows: AttemptRow[],
  sortId: string,
  opts?: { quizClosed?: boolean }
) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') {
      return b.student.full_name.localeCompare(a.student.full_name);
    }
    if (sortId === 'submitted-desc') {
      const at = a.attempt?.submitted_at ? new Date(a.attempt.submitted_at).getTime() : 0;
      const bt = b.attempt?.submitted_at ? new Date(b.attempt.submitted_at).getTime() : 0;
      return bt - at;
    }
    if (sortId === 'submitted-asc') {
      const at = a.attempt?.submitted_at ? new Date(a.attempt.submitted_at).getTime() : Infinity;
      const bt = b.attempt?.submitted_at ? new Date(b.attempt.submitted_at).getTime() : Infinity;
      return at - bt;
    }
    if (sortId === 'marks-desc') {
      return (b.attempt?.score ?? -1) - (a.attempt?.score ?? -1);
    }
    if (sortId === 'marks-asc') {
      const as = a.attempt?.score;
      const bs = b.attempt?.score;
      if (as == null && bs == null) return 0;
      if (as == null) return 1;
      if (bs == null) return -1;
      return as - bs;
    }
    if (sortId === 'status-asc') {
      return statusRank(a, opts?.quizClosed) - statusRank(b, opts?.quizClosed);
    }
    return a.student.full_name.localeCompare(b.student.full_name);
  });
  return copy;
}
