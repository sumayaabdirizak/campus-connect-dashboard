import { downloadCsv } from '@/features/pos/components/download-csv';
import type { Quiz } from '@/lib/course-details/services/quizzes-types';

/// Row-level callbacks the table hands to each row. Defined here rather than
/// imported from the old card list so that list can be deleted without
/// breaking the table.
export type QuizRowHandlers = {
  onEditQuiz: (q: Quiz) => void;
  onViewAttempts: (q: Quiz) => void;
  onDelete: (q: Quiz) => void;
  onTogglePublish: (q: Quiz) => void;
  onDuplicate: (q: Quiz) => void;
  onPreview: (q: Quiz) => void;
  onToggleSelect: (id: number) => void;
};

export const QUIZ_COLUMN_OPTS = [
  { id: 'title', label: 'Title' },
  { id: 'chapter', label: 'Chapter' },
  { id: 'questions', label: 'Questions' },
  { id: 'length', label: 'Length' },
  { id: 'attempts', label: 'Attempts' }
] as const;

export const QUIZ_SORT_OPTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'title-asc', label: 'Title A–Z' },
  { id: 'title-desc', label: 'Title Z–A' },
  { id: 'attempts-desc', label: 'Most attempts' },
  { id: 'questions-desc', label: 'Most questions' }
];

export const QUIZ_ALL_COLS = QUIZ_COLUMN_OPTS.map((c) => c.id);

export const quizQuestionCount = (q: Quiz) => q.questions?.length ?? 0;
export const quizAttemptCount = (q: Quiz) => q._count?.attempts ?? 0;

export function sortQuizzes(rows: Quiz[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'title-asc') return a.title.localeCompare(b.title);
    if (sortId === 'title-desc') return b.title.localeCompare(a.title);
    if (sortId === 'attempts-desc') return quizAttemptCount(b) - quizAttemptCount(a);
    if (sortId === 'questions-desc') return quizQuestionCount(b) - quizQuestionCount(a);
    if (sortId === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    // 'newest' — matches the order the card list used before the table.
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return copy;
}

/// Title + description, so searching for a topic finds the quiz that covers
/// it rather than only exact title matches.
export function filterQuizzes(rows: Quiz[], search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter(
    (q) =>
      q.title.toLowerCase().includes(term) ||
      (q.description ?? '').toLowerCase().includes(term)
  );
}

const EXPORT_HEADER = [
  'Title',
  'Chapter',
  'Mode',
  'Questions',
  'Length (min)',
  'Attempts',
  'Draft'
];

function exportRows(rows: Quiz[]) {
  return rows.map((q) => [
    q.title,
    q.module?.title ?? 'Ungrouped',
    q.mode === 'offline' ? 'Printed' : 'On device',
    quizQuestionCount(q),
    q.duration_minutes,
    quizAttemptCount(q),
    q.is_draft ? 'Yes' : 'No'
  ]);
}

export function exportQuizzesCsv(rows: Quiz[]) {
  downloadCsv('quizzes.csv', EXPORT_HEADER, exportRows(rows));
}
