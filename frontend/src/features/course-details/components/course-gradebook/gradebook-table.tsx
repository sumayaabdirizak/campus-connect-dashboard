'use client';

import { cn } from '@/lib/utils';
import type { Gradebook, GradebookRow } from '../../api/gradebook-types';
import {
  AssignmentCell,
  OverallCell,
  QuizCell
} from './gradebook-cells';
import { GradebookFooter } from './gradebook-footer';
import { assignmentCell, quizCell } from './gradebook-math';

interface GradebookTableProps {
  data: Gradebook;
  filtered: GradebookRow[];
  search: string;
  onRowClick: (row: GradebookRow) => void;
}

export function GradebookTable({
  data,
  filtered,
  search,
  onRowClick
}: GradebookTableProps) {
  const { columns } = data;
  const colSpan = columns.assignments.length + columns.quizzes.length + 2;

  const stickyHead =
    'sticky top-0 z-20 bg-background border-b border-border/60 text-sm font-semibold text-foreground';
  const stickyCorner = cn(
    stickyHead,
    'left-0 z-30 text-left after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border/60'
  );
  const stickyCell =
    'sticky left-0 z-10 bg-background after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border/40';
  const columnHead =
    'min-w-[72px] border-l border-border/40 px-2 py-2.5 text-center font-semibold';

  return (
    <div className='max-h-[min(640px,calc(100dvh-16rem))] overflow-auto'>
      <table className='w-full min-w-max text-sm'>
        <thead>
          <tr className={stickyHead}>
            <th className={cn(stickyCorner, 'min-w-[200px] px-3 py-2.5')}>Student</th>
            {columns.assignments.map((a) => (
              <th key={`a-${a.id}`} className={columnHead} title={a.title}>
                <span className='line-clamp-2 text-sm leading-snug'>{a.title}</span>
                <span className='mt-0.5 block text-xs font-medium tabular-nums text-muted-foreground'>
                  /{a.maxMarks}
                </span>
              </th>
            ))}
            {columns.quizzes.map((q) => (
              <th key={`q-${q.id}`} className={columnHead} title={q.title}>
                <span className='line-clamp-2 text-sm leading-snug'>{q.title}</span>
              </th>
            ))}
            <th className={cn(columnHead, 'text-foreground')}>
              <span>Overall</span>
              <span className='mt-0.5 block text-xs font-medium text-muted-foreground'>
                % · pts
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.studentId}
              role='button'
              tabIndex={0}
              onClick={() => onRowClick(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className='cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30'
            >
              <td className={cn(stickyCell, 'px-3 py-2.5')}>
                <p className='truncate font-medium'>{row.name}</p>
                <p className='truncate text-xs text-muted-foreground'>
                  {row.number || row.email}
                </p>
              </td>
              {columns.assignments.map((a) => (
                <td
                  key={`a-${a.id}`}
                  className='border-l border-border/40 px-2 py-2.5 text-center text-sm'
                >
                  <AssignmentCell cell={assignmentCell(row, a.id)} />
                </td>
              ))}
              {columns.quizzes.map((q) => (
                <td
                  key={`q-${q.id}`}
                  className='border-l border-border/40 px-2 py-2.5 text-center text-sm'
                >
                  <QuizCell cell={quizCell(row, q.id)} />
                </td>
              ))}
              <td className='border-l border-border/40 px-2 py-2.5 text-center font-medium tabular-nums'>
                <OverallCell row={row} columns={columns} />
              </td>
            </tr>
          ))}

          {filtered.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className='px-4 py-10 text-center text-sm text-muted-foreground'
              >
                {search.trim()
                  ? `No students match "${search}".`
                  : 'No students match this filter.'}
              </td>
            </tr>
          ) : null}
        </tbody>

        <GradebookFooter data={data} stickyCell={stickyCell} />
      </table>
    </div>
  );
}
