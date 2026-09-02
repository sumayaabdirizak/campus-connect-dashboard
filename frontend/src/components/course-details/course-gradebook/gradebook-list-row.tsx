'use client';

import {
  PosTableCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import type { GradebookColumns, GradebookRow } from '@/lib/course-details/services/gradebook-types';
import { StudentNameCell } from '../course-roster/student-name-cell';
import { AssignmentCell, OverallCell, QuizCell } from './gradebook-cells';
import { assignmentCell, quizCell } from './gradebook-math';

interface GradebookListRowProps {
  row: GradebookRow;
  columns: GradebookColumns;
  courseMaxMarks: number;
  stickyCellClass: string;
  onRowClick?: (row: GradebookRow) => void;
}

export function GradebookListRow({
  row,
  columns,
  courseMaxMarks,
  stickyCellClass,
  onRowClick
}: GradebookListRowProps) {
  return (
    <PosTableRow
      className='cursor-pointer'
      onClick={() => onRowClick?.(row)}
    >
      <PosTableCell className={`min-w-[200px] max-w-[280px] whitespace-normal ${stickyCellClass}`}>
        <StudentNameCell name={row.name} />
      </PosTableCell>
      {columns.assignments.map((a) => (
        <PosTableCell
          key={`a-${a.id}`}
          align='center'
          className='min-w-[88px] whitespace-normal border-l border-border/40'
        >
          <AssignmentCell cell={assignmentCell(row, a.id)} />
        </PosTableCell>
      ))}
      {columns.quizzes.map((q) => (
        <PosTableCell
          key={`q-${q.id}`}
          align='center'
          className='min-w-[88px] whitespace-normal border-l border-border/40'
        >
          <QuizCell cell={quizCell(row, q.id)} maxMarks={q.maxMarks} />
        </PosTableCell>
      ))}
      <PosTableCell
        align='center'
        className='min-w-[88px] whitespace-normal border-l border-border/40 font-medium tabular-nums'
      >
        <OverallCell row={row} columns={columns} courseMaxMarks={courseMaxMarks} />
      </PosTableCell>
    </PosTableRow>
  );
}
