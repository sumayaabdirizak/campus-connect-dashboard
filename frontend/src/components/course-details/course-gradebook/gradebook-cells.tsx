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
  computeOverallPoints,
  fmtPct,
  fmtPoints
} from './gradebook-math';

export function AssignmentCell({
  cell
}: {
  cell: GradebookAssignmentCell | null | undefined;
}) {
  if (!cell) return <span className='text-muted-foreground'>—</span>;
  if (cell.grade != null) {
    const pct = cell.maxMarks > 0 ? (cell.grade / cell.maxMarks) * 100 : null;
    return (
      <span className={cn('font-medium tabular-nums', bandText(pct))}>
        {cell.grade}
        <span className='font-normal text-muted-foreground'>/{cell.maxMarks}</span>
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
  cell
}: {
  cell: GradebookQuizCell | null | undefined;
}) {
  if (!cell || cell.pct == null) {
    return <span className='text-muted-foreground'>—</span>;
  }
  return (
    <span className={cn('font-medium tabular-nums', bandText(cell.pct))}>
      {fmtPct(cell.pct)}
    </span>
  );
}

export function OverallCell({
  row,
  columns
}: {
  row: GradebookRow;
  columns: GradebookColumns;
}) {
  const points = computeOverallPoints(row, columns);
  if (row.overallPct == null && !points) {
    return <span className='text-muted-foreground'>—</span>;
  }
  return (
    <div className='flex flex-col items-center gap-0.5 leading-tight'>
      <span className={cn('font-semibold', bandText(row.overallPct))}>
        {fmtPct(row.overallPct)}
      </span>
      {points ? (
        <span className='text-xs font-normal text-muted-foreground tabular-nums'>
          {fmtPoints(points.earned, points.max)}
        </span>
      ) : null}
    </div>
  );
}
