'use client';

import { useEffect, useMemo, useState } from 'react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell
} from '@/features/pos/components/pos-table';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { showToast } from '@/lib/notifications';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import { AttemptTableRow } from './attempt-table-row';
import {
  ATTEMPT_SORT_OPTS,
  headerBlack,
  OFFLINE_ATTEMPT_ALL_COLS,
  OFFLINE_ATTEMPT_COLUMN_OPTS,
  ONLINE_ATTEMPT_ALL_COLS,
  ONLINE_ATTEMPT_COLUMN_OPTS,
  sortAttemptRows
} from './attempts-table-utils';
import {
  downloadAttemptsCsv,
  filterAttemptRows,
  offlineStatusCounts,
  statusCounts,
  type AttemptRow,
  type OfflineStatusFilter,
  type StatusFilter
} from './helpers';

export function AttemptsTable({
  isLoading,
  allRows,
  rosterEmpty,
  onGrade,
  isOffline,
  quizId,
  quizTitle,
  totalPoints,
  quizClosed = false
}: {
  isLoading: boolean;
  allRows: AttemptRow[];
  rosterEmpty: boolean;
  onGrade: (attempt: QuizAttempt) => void;
  isOffline: boolean;
  quizId: number;
  quizTitle: string;
  totalPoints: number;
  quizClosed?: boolean;
}) {
  const columnOpts = isOffline ? OFFLINE_ATTEMPT_COLUMN_OPTS : ONLINE_ATTEMPT_COLUMN_OPTS;
  const allCols = isOffline ? OFFLINE_ATTEMPT_ALL_COLS : ONLINE_ATTEMPT_ALL_COLS;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter | OfflineStatusFilter>('all');
  const [sortId, setSortId] = useState('name-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...allCols]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const col = (id: string) => visibleCols.includes(id);
  const statusOpts = { quizClosed };
  const onlineCounts = statusCounts(allRows, statusOpts);
  const offlineCounts = offlineStatusCounts(allRows);

  useEffect(() => {
    setVisibleCols([...allCols]);
  }, [isOffline, allCols]);

  useEffect(() => {
    setStatusFilter('all');
  }, [isOffline, quizClosed]);

  const filteredRows = useMemo(
    () =>
      sortAttemptRows(
        filterAttemptRows(allRows, statusFilter, search, isOffline, statusOpts),
        sortId,
        statusOpts
      ),
    [allRows, statusFilter, search, sortId, isOffline, quizClosed]
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortId, allRows.length]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const emptyMsg =
    search.trim() || statusFilter !== 'all'
      ? 'No students match your filters.'
      : rosterEmpty
        ? 'No students enrolled yet.'
        : 'No attempts yet.';

  if (isLoading) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border border-border bg-card'>
        <div className='border-primary size-8 animate-spin rounded-full border-4 border-t-transparent' />
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search students…'
      columns={[...columnOpts]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={ATTEMPT_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        downloadAttemptsCsv(quizTitle, allRows, { quizClosed });
        showToast('success', 'Exported attempts CSV');
      }}
      toolbarEnd={
        <SegmentedControl
          ariaLabel='Filter attempts by status'
          value={statusFilter}
          onChange={setStatusFilter}
          options={
            isOffline
              ? [
                  { value: 'all', label: 'All', count: offlineCounts.all },
                  {
                    value: 'not_recorded',
                    label: 'Not recorded',
                    count: offlineCounts.not_recorded
                  },
                  {
                    value: 'recorded',
                    label: 'Recorded',
                    count: offlineCounts.recorded
                  },
                  { value: 'absent', label: 'Absent', count: offlineCounts.absent },
                  { value: 'cheat', label: 'Cheating', count: offlineCounts.cheat }
                ]
              : [
                  { value: 'all', label: 'All', count: onlineCounts.all },
                  {
                    value: 'submitted',
                    label: 'Submitted',
                    count: onlineCounts.submitted
                  },
                  {
                    value: 'in_progress',
                    label: 'In progress',
                    count: onlineCounts.in_progress
                  },
                  quizClosed
                    ? {
                        value: 'missed',
                        label: 'Missed',
                        count: onlineCounts.missed
                      }
                    : {
                        value: 'not_started',
                        label: 'Not started',
                        count: onlineCounts.not_started
                      }
                ]
          }
        />
      }
      footer={
        filteredRows.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filteredRows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='students'
          />
        ) : null
      }
    >
      {filteredRows.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium text-foreground'>{emptyMsg}</p>
        </div>
      ) : (
        <>
          {isOffline ? (
            <p className='border-b border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground'>
              Pick a result from the dropdown, or enter marks and click{' '}
              <span className='font-medium text-foreground'>Save</span>.
            </p>
          ) : null}
          <PosTable>
          <PosTableHead>
            <tr>
              {col('student') ? (
                <PosTableHeaderCell className={headerBlack}>Student</PosTableHeaderCell>
              ) : null}
              {col('started') ? (
                <PosTableHeaderCell className={headerBlack}>Started</PosTableHeaderCell>
              ) : null}
              {col('submitted') ? (
                <PosTableHeaderCell className={headerBlack}>Submitted</PosTableHeaderCell>
              ) : null}
              {col('status') ? (
                <PosTableHeaderCell className={headerBlack}>Status</PosTableHeaderCell>
              ) : null}
              {col('monitoring') ? (
                <PosTableHeaderCell className={headerBlack}>Monitoring</PosTableHeaderCell>
              ) : null}
              {col('marks') ? (
                <PosTableHeaderCell align='right' className={headerBlack}>
                  {isOffline ? 'Record result' : 'Marks'}
                </PosTableHeaderCell>
              ) : null}
              {!isOffline ? (
                <PosTableHeaderCell align='right' className={headerBlack}>
                  Action
                </PosTableHeaderCell>
              ) : null}
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((row) => (
              <AttemptTableRow
                key={row.studentId}
                row={row}
                col={col}
                onGrade={onGrade}
                isOffline={isOffline}
                quizId={quizId}
                totalPoints={totalPoints}
                quizClosed={quizClosed}
              />
            ))}
          </PosTableBody>
        </PosTable>
        </>
      )}
    </PosTableCard>
  );
}
