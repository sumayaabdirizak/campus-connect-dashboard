'use client';

import { cn } from '@/lib/utils';
import type {
  GradebookAssignmentCell,
  GradebookColumns,
  GradebookQuizCell,
  GradebookRow
} from '@/lib/course-details/services/gradebook-types';
import {
  bandText,
  fmtPoints,
  MAX_COURSE_MARK
} from './gradebook-math';

export function AssignmentCell({
  cell,
  editable
}: {
  cell: GradebookAssignmentCell | null | undefined;
  editable?: boolean;
}) {
  const interactive = editable
    ? 'rounded px-1 py-0.5 hover:bg-muted/70 underline-offset-2 hover:underline'
    : undefined;

  if (!cell) {
    return (
      <span className={cn('text-muted-foreground', interactive)} title={editable ? 'Enter grade' : undefined}>
        —
      </span>
    );
  }
  if (cell.grade != null) {
    const maxMarks = Math.min(cell.maxMarks, MAX_COURSE_MARK);
    const grade = Math.min(cell.grade, maxMarks);
    const pct = maxMarks > 0 ? (grade / maxMarks) * 100 : null;
    return (
      <span
        className={cn('font-medium tabular-nums', bandText(pct), interactive)}
        title={editable ? 'Edit grade' : undefined}
      >
        {fmtPoints(grade, maxMarks)}
        {cell.late ? (
          <span className='font-normal text-pink-600 dark:text-pink-400'> · late</span>
        ) : null}
      </span>
    );
  }
  if (cell.submitted) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
          editable && 'hover:ring-1 hover:ring-amber-400/50'
        )}
        title={editable ? 'Enter grade' : undefined}
      >
        To grade
      </span>
    );
  }
  return (
    <span className={cn('text-muted-foreground', interactive)} title={editable ? 'Enter grade' : undefined}>
      —
    </span>
  );
}

export function QuizCell({
  cell,
  maxMarks,
  editable
}: {
  cell: GradebookQuizCell | null | undefined;
  maxMarks: number;
  editable?: boolean;
}) {
  const interactive = editable
    ? 'rounded px-1 py-0.5 hover:bg-muted/70 underline-offset-2 hover:underline'
    : undefined;

  if (!cell || cell.pct == null || maxMarks <= 0) {
    return (
      <span className={cn('text-muted-foreground', interactive)} title={editable ? 'Enter grade' : undefined}>
        —
      </span>
    );
  }
  const earned =
    cell.earned != null ? cell.earned : (cell.pct / 100) * maxMarks;
  const pct = maxMarks > 0 ? (earned / maxMarks) * 100 : cell.pct;
  return (
    <span
      className={cn('font-medium tabular-nums', bandText(pct), interactive)}
      title={editable ? 'Edit grade' : undefined}
    >
      {fmtPoints(earned, maxMarks)}
    </span>
  );
}

export function OverallCell({
  row,
  courseMaxMarks
}: {
  row: GradebookRow;
  columns: GradebookColumns;
  courseMaxMarks: number;
}) {
  const max = courseMaxMarks > 0 ? courseMaxMarks : MAX_COURSE_MARK;
  const earned = Math.min(max, row.overallEarned ?? 0);
  if (row.overallPct == null && earned <= 0) {
    return <span className='text-muted-foreground'>—</span>;
  }
  return (
    <span className={cn('font-semibold tabular-nums', bandText(row.overallPct))}>
      {fmtPoints(earned, max)}
    </span>
  );
}
