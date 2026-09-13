'use client';

import {
  PosTableCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import type { GradebookColumns, GradebookRow } from '@/lib/course-details/services/gradebook-types';
import { StudentNameCell } from '../course-roster/student-name-cell';
import { AssignmentCell, OverallCell, QuizCell } from './gradebook-cells';
import type { GradebookEditTarget } from './gradebook-edit-dialog';
import { assignmentCell, quizCell } from './gradebook-math';

interface GradebookListRowProps {
  row: GradebookRow;
  columns: GradebookColumns;
  courseMaxMarks: number;
  stickyCellClass: string;
  onRowClick?: (row: GradebookRow) => void;
  onEditGrade?: (target: GradebookEditTarget) => void;
}

export function GradebookListRow({
  row,
  columns,
  courseMaxMarks,
  stickyCellClass,
  onRowClick,
  onEditGrade
}: GradebookListRowProps) {
  return (
    <PosTableRow
      className='cursor-pointer'
      onClick={() => onRowClick?.(row)}
    >
      <PosTableCell className={`min-w-[200px] max-w-[280px] whitespace-normal ${stickyCellClass}`}>
        <StudentNameCell name={row.name} />
      </PosTableCell>
      {columns.assignments.map((a) => {
        const cell = assignmentCell(row, a.id);
        const openEdit = onEditGrade
          ? () =>
              onEditGrade({
                kind: 'assignment',
                assignmentId: a.id,
                title: a.title,
                maxMarks: a.maxMarks,
                studentId: row.studentId,
                studentName: row.name,
                currentGrade: cell?.grade ?? null
              })
          : undefined;
        return (
          <PosTableCell
            key={`a-${a.id}`}
            align='center'
            className='min-w-[88px] whitespace-normal border-l border-border/40'
          >
            {openEdit ? (
              <button
                type='button'
                className='inline-flex max-w-full items-center justify-center'
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit();
                }}
              >
                <AssignmentCell cell={cell} editable />
              </button>
            ) : (
              <AssignmentCell cell={cell} />
            )}
          </PosTableCell>
        );
      })}
      {columns.quizzes.map((q) => {
        const cell = quizCell(row, q.id);
        const isOffline = q.mode === 'offline';
        const earnedRaw =
          cell?.earned != null
            ? cell.earned
            : cell?.pct != null && q.maxMarks > 0
              ? (cell.pct / 100) * q.maxMarks
              : null;
        const earned =
          earnedRaw != null ? Math.round(earnedRaw * 10) / 10 : null;
        const openEdit =
          onEditGrade && isOffline
            ? () =>
                onEditGrade({
                  kind: 'offline_quiz',
                  quizId: q.id,
                  title: q.title,
                  maxMarks: q.maxMarks,
                  studentId: row.studentId,
                  studentName: row.name,
                  currentEarned: earned
                })
            : undefined;
        return (
          <PosTableCell
            key={`q-${q.id}`}
            align='center'
            className='min-w-[88px] whitespace-normal border-l border-border/40'
          >
            {openEdit ? (
              <button
                type='button'
                className='inline-flex max-w-full items-center justify-center'
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit();
                }}
              >
                <QuizCell cell={cell} maxMarks={q.maxMarks} editable />
              </button>
            ) : (
              <QuizCell cell={cell} maxMarks={q.maxMarks} />
            )}
          </PosTableCell>
        );
      })}
      <PosTableCell
        align='center'
        className='min-w-[88px] whitespace-normal border-l border-border/40 font-medium tabular-nums'
      >
        <OverallCell row={row} columns={columns} courseMaxMarks={courseMaxMarks} />
      </PosTableCell>
    </PosTableRow>
  );
}
