'use client';

import { cn } from '@/lib/utils';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell
} from '@/features/pos/components/pos-table';
import { posTableColors as c } from '@/components/pos/pos-colors';
import type { Gradebook, GradebookRow } from '@/lib/course-details/services/gradebook-types';
import { GradebookFooter } from './gradebook-footer';
import { GradebookListRow } from './gradebook-list-row';

interface GradebookTableProps {
  data: Gradebook;
  rows: GradebookRow[];
  search: string;
  filterLabel: string;
  onRowClick: (row: GradebookRow) => void;
}

export function GradebookTable({
  data,
  rows,
  search,
  filterLabel,
  onRowClick
}: GradebookTableProps) {
  const { columns, courseMaxMarks } = data;
  const colSpan = columns.assignments.length + columns.quizzes.length + 2;

  const stickyHead = cn(
    'sticky left-0 z-30 text-left uppercase tracking-wide text-xs after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border'
  );
  const stickyCell =
    'sticky left-0 z-10 bg-card after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border/40';

  return (
    <div className='max-h-[min(640px,calc(100dvh-16rem))] overflow-auto'>
      <PosTable>
        <PosTableHead>
          <tr>
            <PosTableHeaderCell
              className={cn(stickyHead, '!text-foreground min-w-[200px]')}
              style={{ backgroundColor: c.headerBg }}
            >
              Student
            </PosTableHeaderCell>
            {columns.assignments.map((a) => (
              <PosTableHeaderCell
                key={`a-${a.id}`}
                align='center'
                className='!text-foreground min-w-[88px] whitespace-normal border-l border-border/40 uppercase tracking-wide text-xs'
                title={a.title}
              >
                <span className='line-clamp-2 text-[11px] font-bold leading-snug normal-case tracking-normal'>
                  {a.title}
                </span>
                <span className='mt-0.5 block text-[10px] font-medium tabular-nums text-muted-foreground'>
                  /{a.maxMarks}
                </span>
              </PosTableHeaderCell>
            ))}
            {columns.quizzes.map((q) => (
              <PosTableHeaderCell
                key={`q-${q.id}`}
                align='center'
                className='!text-foreground min-w-[88px] whitespace-normal border-l border-border/40 uppercase tracking-wide text-xs'
                title={q.title}
              >
                <span className='line-clamp-2 text-[11px] font-bold leading-snug normal-case tracking-normal'>
                  {q.title}
                </span>
                <span className='mt-0.5 block text-[10px] font-medium tabular-nums text-muted-foreground'>
                  /{q.maxMarks || '—'}
                </span>
              </PosTableHeaderCell>
            ))}
            <PosTableHeaderCell
              align='center'
              className='!text-foreground min-w-[88px] whitespace-normal border-l border-border/40 uppercase tracking-wide text-xs'
            >
              <span>Overall</span>
              <span className='mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-muted-foreground'>
                /{courseMaxMarks}
              </span>
            </PosTableHeaderCell>
          </tr>
        </PosTableHead>

        <PosTableBody>
          {rows.map((row) => (
            <GradebookListRow
              key={row.studentId}
              row={row}
              columns={columns}
              courseMaxMarks={courseMaxMarks}
              stickyCellClass={stickyCell}
              onRowClick={onRowClick}
            />
          ))}

          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className='px-4 py-10 text-center text-sm text-muted-foreground'
              >
                {search.trim()
                  ? `No students match "${search}".`
                  : `No students match ${filterLabel}.`}
              </td>
            </tr>
          ) : null}
        </PosTableBody>

        <GradebookFooter data={data} stickyCell={stickyCell} />
      </PosTable>
    </div>
  );
}
