'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListSkeleton } from '../../_shared/list-skeleton';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import { AttemptTableRow } from './attempt-table-row';
import type { AttemptRow, StatusFilter } from './helpers';

export function AttemptsTable({
  isLoading,
  rows,
  search,
  statusFilter,
  rosterEmpty,
  onGrade,
  isOffline,
  quizId,
  totalPoints,
}: {
  isLoading: boolean;
  rows: AttemptRow[];
  search: string;
  statusFilter: StatusFilter;
  rosterEmpty: boolean;
  onGrade: (attempt: QuizAttempt) => void;
  isOffline: boolean;
  quizId: number;
  totalPoints: number;
}) {
  if (isLoading) return <ListSkeleton variant='row' count={3} />;

  // Offline quizzes are paper handouts — "Started"/"Monitoring" describe
  // in-app behavior that never happened, so they'd just be a column of
  // dashes. Drop them and let Score double as the entry point.
  const colCount = isOffline ? 4 : 7;

  return (
    <div className='overflow-hidden rounded-lg border bg-card shadow-sm'>
      <div className='max-h-[min(640px,calc(100dvh-18rem))] overflow-auto overscroll-contain'>
        <Table className='min-w-[880px]'>
          <TableHeader className='sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85'>
            <TableRow className='hover:bg-transparent border-b [&>th]:h-10 [&>th]:px-3 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground'>
              <TableHead>Student</TableHead>
              {isOffline ? null : (
                <>
                  <TableHead>Started</TableHead>
                  <TableHead>Submitted</TableHead>
                </>
              )}
              <TableHead>Status</TableHead>
              {isOffline ? null : <TableHead>Monitoring</TableHead>}
              <TableHead className='text-right'>Score</TableHead>
              {isOffline ? null : <TableHead className='w-px' />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <AttemptTableRow
                key={row.studentId}
                row={row}
                onGrade={onGrade}
                isOffline={isOffline}
                quizId={quizId}
                totalPoints={totalPoints}
              />
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className='text-center text-sm text-muted-foreground py-8'
                >
                  {search.trim() || statusFilter !== 'all'
                    ? 'No students match your filters.'
                    : rosterEmpty
                      ? 'No students enrolled yet.'
                      : 'No attempts yet.'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
