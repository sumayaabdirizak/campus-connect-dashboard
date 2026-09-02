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
  cell
}: {
  cell: GradebookAssignmentCell | null | undefined;
}) {
  if (!cell) return <span className='text-muted-foreground'>—</span>;
  if (cell.grade != null) {
    const maxMarks = Math.min(cell.maxMarks, MAX_COURSE_MARK);
    const grade = Math.min(cell.grade, maxMarks);
    const pct = maxMarks > 0 ? (grade / maxMarks) * 100 : null;
    return (
      <span className={cn('font-medium tabular-nums', bandText(pct))}>
        {fmtPoints(grade, maxMarks)}
        {cell.late ? (
          <span className='font-normal text-pink-600 dark:text-pink-400'> · late</span>
        ) : null}
      </span>
    );
  }
  if (cell.submitted) {
    return (
      <span className='inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'>
        To grade
      </span>
    );
  }
  return <span className='text-muted-foreground'>—</span>;
}

export function QuizCell({
  cell,
  maxMarks
}: {
  cell: GradebookQuizCell | null | undefined;
  maxMarks: number;
}) {
  if (!cell || cell.pct == null || maxMarks <= 0) {
    return <span className='text-muted-foreground'>—</span>;
  }
  const earned =
    cell.earned != null ? cell.earned : (cell.pct / 100) * maxMarks;
  const pct = maxMarks > 0 ? (earned / maxMarks) * 100 : cell.pct;
  return (
    <span className={cn('font-medium tabular-nums', bandText(pct))}>
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
  const max = Math.min(courseMaxMarks, MAX_COURSE_MARK);
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
