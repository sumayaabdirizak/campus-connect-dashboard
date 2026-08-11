import type {
  GradebookAssignmentCell,
  GradebookColumns,
  GradebookQuizCell,
  GradebookRow
} from '@/lib/course-details/services/gradebook-types';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';

export type GradeFilter = 'all' | 'needs_grading';

export function fmtPct(pct: number | null): string {
  return pct == null ? '—' : `${Math.round(pct)}%`;
}

export function bandText(pct: number | null): string {
  if (pct == null) return '';
  if (pct >= 80) return 'text-emerald-700 dark:text-emerald-300';
  if (pct >= 60) return 'text-amber-700 dark:text-amber-300';
  return 'text-pink-700 dark:text-pink-300';
}

export function assignmentCell(
  row: GradebookRow,
  id: number
): GradebookAssignmentCell | null | undefined {
  return row.assignments[id] ?? row.assignments[String(id)];
}

export function quizCell(
  row: GradebookRow,
  id: number
): GradebookQuizCell | null | undefined {
  return row.quizzes[id] ?? row.quizzes[String(id)];
}

export function computeOverallPoints(
  row: GradebookRow,
  columns: GradebookColumns
): { earned: number; max: number } | null {
  let earned = 0;
  let max = 0;
  for (const a of columns.assignments) {
    const cell = assignmentCell(row, a.id);
    if (cell?.grade != null) {
      earned += cell.grade;
      max += cell.maxMarks;
    }
  }
  for (const q of columns.quizzes) {
    const cell = quizCell(row, q.id);
    if (cell?.pct != null) {
      earned += cell.pct;
      max += 100;
    }
  }
  return max > 0 ? { earned, max } : null;
}

export function fmtPoints(earned: number, max: number): string {
  const format = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return `${format(earned)}/${format(max)}`;
}

export function computeClassAveragePoints(
  rows: GradebookRow[],
  columns: GradebookColumns
): { earned: number; max: number } | null {
  const perStudent = rows
    .map((row) => computeOverallPoints(row, columns))
    .filter((p): p is { earned: number; max: number } => p != null);
  if (perStudent.length === 0) return null;
  const earned =
    perStudent.reduce((sum, p) => sum + p.earned, 0) / perStudent.length;
  const max = perStudent.reduce((sum, p) => sum + p.max, 0) / perStudent.length;
  return { earned, max };
}

export function rowNeedsGrading(row: GradebookRow, columns: GradebookColumns): boolean {
  for (const a of columns.assignments) {
    const cell = assignmentCell(row, a.id);
    if (cell?.submitted && cell.grade == null) return true;
  }
  return false;
}

export function toRosterStudent(row: GradebookRow): RosterStudent {
  return {
    id: row.studentId,
    full_name: row.name,
    email: row.email,
    number: row.number ?? ''
  };
}
