import type { SubmissionSortKey } from './use-submission-rows';

export const SUBMISSION_COLUMN_OPTS = [
  { id: 'name', label: 'Student' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'due', label: 'Effective due' },
  { id: 'status', label: 'Status' },
  { id: 'grade', label: 'Grade' },
  { id: 'file', label: 'File' }
] as const;

export const GROUP_SUBMISSION_COLUMN_OPTS = [
  { id: 'name', label: 'Group' },
  { id: 'members', label: 'Members' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'status', label: 'Status' },
  { id: 'grade', label: 'Grade' },
  { id: 'file', label: 'File' }
] as const;

export const SUBMISSION_SORT_OPTS = [
  { id: 'name-asc', label: 'Name A–Z' },
  { id: 'name-desc', label: 'Name Z–A' },
  { id: 'submitted-desc', label: 'Submitted (newest)' },
  { id: 'submitted-asc', label: 'Submitted (oldest)' },
  { id: 'status-asc', label: 'Status' },
  { id: 'grade-desc', label: 'Grade (high–low)' },
  { id: 'grade-asc', label: 'Grade (low–high)' }
];

export const SUBMISSION_ALL_COLS = SUBMISSION_COLUMN_OPTS.map((c) => c.id);
export const GROUP_SUBMISSION_ALL_COLS = GROUP_SUBMISSION_COLUMN_OPTS.map((c) => c.id);

export function sortIdFromSubSort(sort: { key: SubmissionSortKey; dir: 'asc' | 'desc' }) {
  if (sort.key === 'submitted_at') return `submitted-${sort.dir}`;
  return `${sort.key}-${sort.dir}`;
}

export function subSortFromId(sortId: string): { key: SubmissionSortKey; dir: 'asc' | 'desc' } {
  const dir = sortId.endsWith('-desc') ? 'desc' : 'asc';
  if (sortId.startsWith('submitted')) return { key: 'submitted_at', dir };
  if (sortId.startsWith('status')) return { key: 'status', dir };
  if (sortId.startsWith('grade')) return { key: 'grade', dir };
  return { key: 'name', dir };
}

export const headerBlack = '!text-[#101828]';
