import type {
  GradebookAssignmentCell,
  GradebookColumns,
  GradebookQuizCell,
  GradebookRow
} from '@/lib/course-details/services/gradebook-types';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';

export type GradeFilter = 'all' | 'needs_grading';

/** Course mark budget (assignments + quizzes share Course.maxMarks, default 100). */
export const MAX_COURSE_MARK = 100;

export function fmtPct(pct: number | null): string {
  return pct == null ? '—' : `${Math.round(pct)}%`;
}

/** Render a percentage as earned/max points (e.g. 90% of 20 → "18/20"). */
export function fmtScoreFromPct(pct: number | null, max: number = MAX_COURSE_MARK): string {
  if (pct == null) return '—';
  const scaleMax = Math.min(max, MAX_COURSE_MARK);
  const earned = Math.min(scaleMax, Math.max(0, (pct / 100) * scaleMax));
  return fmtPoints(earned, scaleMax);
}

export function fmtAssignmentGrade(grade: number, maxMarks: number): string {
  return fmtPoints(grade, maxMarks);
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

export function computeCourseEarned(row: GradebookRow, columns: GradebookColumns): number {
  let earned = 0;
  for (const a of columns.assignments) {
    const cell = assignmentCell(row, a.id);
    if (cell?.grade != null) earned += cell.grade;
  }
  for (const q of columns.quizzes) {
    const cell = quizCell(row, q.id);
    if (cell?.earned != null) earned += cell.earned;
    else if (cell?.pct != null && q.maxMarks > 0) {
      earned += (cell.pct / 100) * q.maxMarks;
    }
  }
  return earned;
}

export function fmtPoints(earned: number, max: number): string {
  let displayMax = max;
  let displayEarned = earned;
  if (max > MAX_COURSE_MARK) {
    displayMax = MAX_COURSE_MARK;
    displayEarned = max > 0 ? (earned / max) * MAX_COURSE_MARK : 0;
  }
  displayEarned = Math.min(displayMax, Math.max(0, displayEarned));
  const format = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return `${format(displayEarned)}/${format(displayMax)}`;
}

export function computeClassAverageEarned(
  rows: GradebookRow[],
  columns: GradebookColumns
): number | null {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, row) => sum + computeCourseEarned(row, columns), 0);
  return total / rows.length;
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
