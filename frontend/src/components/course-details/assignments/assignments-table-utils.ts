import { downloadCsv } from '@/features/pos/components/download-csv';
import type { Assignment } from '@/lib/course-details/services/assignments-types';

export const ASSIGNMENT_COLUMN_OPTS = [
  { id: 'title', label: 'Title' },
  { id: 'work', label: 'Work' },
  { id: 'grading', label: 'Grading' },
  { id: 'opens', label: 'Opens' },
  { id: 'due', label: 'Due' },
  { id: 'submissions', label: 'Submissions' }
] as const;

export const ASSIGNMENT_SORT_OPTS = [
  { id: 'title-asc', label: 'Title A–Z' },
  { id: 'title-desc', label: 'Title Z–A' },
  { id: 'due-asc', label: 'Due date (earliest)' },
  { id: 'due-desc', label: 'Due date (latest)' },
  { id: 'submissions-desc', label: 'Most submissions' }
];

export const ASSIGNMENT_ALL_COLS = ASSIGNMENT_COLUMN_OPTS.map((c) => c.id);

export function sortAssignments(rows: Assignment[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'title-desc') return b.title.localeCompare(a.title);
    if (sortId === 'due-asc') {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (sortId === 'due-desc') {
      return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
    }
    if (sortId === 'submissions-desc') {
      const ac = a._count?.submissions ?? a.submissions?.length ?? 0;
      const bc = b._count?.submissions ?? b.submissions?.length ?? 0;
      return bc - ac;
    }
    return a.title.localeCompare(b.title);
  });
  return copy;
}

const EXPORT_HEADER = ['Title', 'Work', 'Grading', 'Opens', 'Due', 'Submissions', 'Draft'];

function exportRows(rows: Assignment[]) {
  return rows.map((a) => [
    a.title,
    a.workMode === 'GROUP' ? 'Group' : 'Individual',
    a.gradingScope === 'GROUP' ? 'Group grade' : 'Per student',
    a.open_at ? new Date(a.open_at).toLocaleString() : '',
    new Date(a.due_date).toLocaleString(),
    a._count?.submissions ?? a.submissions?.length ?? 0,
    a.is_draft ? 'Yes' : 'No'
  ]);
}

export function exportAssignmentsCsv(rows: Assignment[]) {
  downloadCsv('assignments.csv', EXPORT_HEADER, exportRows(rows));
}
