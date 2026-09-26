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
import type {
  Assignment,
  Submission,
  SubmissionExtension
} from '@/lib/course-details/services/assignments-types';
import type { GroupRow, SubmissionRow } from './shared';
import { GroupSubmissionRow } from './group-submission-row';
import { StudentSubmissionRow } from './student-submission-row';
import {
  submissionStatusCounts,
  type SubmissionFilter,
  type SubmissionSortKey
} from './use-submission-rows';
import {
  GROUP_SUBMISSION_ALL_COLS,
  GROUP_SUBMISSION_COLUMN_OPTS,
  SUBMISSION_ALL_COLS,
  SUBMISSION_COLUMN_OPTS,
  SUBMISSION_SORT_OPTS,
  headerBlack,
  sortIdFromSubSort,
  subSortFromId
} from './submissions-table-utils';

type Props = {
  isGroupMode: boolean;
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  filter: SubmissionFilter;
  onFilterChange: (v: SubmissionFilter) => void;
  allStudentRows: SubmissionRow[];
  allGroupRows: GroupRow[];
  subSort: { key: SubmissionSortKey; dir: 'asc' | 'desc' };
  onSortChange: (next: { key: SubmissionSortKey; dir: 'asc' | 'desc' }) => void;
  selectedRows: Set<number>;
  onToggleRow: (id: number, checked: boolean) => void;
  onGrade: (sub: Submission) => void;
  /** Open the grading drawer to record a mark for a student with no submission (hand-in / offline). */
  onEnterMarks: (student: { id: number; full_name: string; number: string; email?: string }) => void;
  /** Open extend flow for a roster row with no submission yet. */
  onExtendMissing: (targetId: number) => void;
  filteredGroupSubs: GroupRow[];
  filteredSubs: SubmissionRow[];
  groupsEmpty: boolean;
  rosterEmpty: boolean;
  assignment: Assignment;
  extensions: SubmissionExtension[];
  onExport: () => void;
};

export function SubmissionsTable(p: Props) {
  const columnOpts = p.isGroupMode ? GROUP_SUBMISSION_COLUMN_OPTS : SUBMISSION_COLUMN_OPTS;
  const allCols = p.isGroupMode ? GROUP_SUBMISSION_ALL_COLS : SUBMISSION_ALL_COLS;
  const [visibleCols, setVisibleCols] = useState<string[]>([...allCols]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const col = (id: string) => visibleCols.includes(id);

  const counts = useMemo(
    () =>
      submissionStatusCounts({
        isGroupMode: p.isGroupMode,
        studentRows: p.allStudentRows,
        groupRows: p.allGroupRows,
        assignment: p.assignment,
        extensions: p.extensions
      }),
    [
      p.isGroupMode,
      p.allStudentRows,
      p.allGroupRows,
      p.assignment,
      p.extensions
    ]
  );

  useEffect(() => {
    setVisibleCols([...allCols]);
  }, [p.isGroupMode, allCols]);

  const rows = p.isGroupMode ? p.filteredGroupSubs : p.filteredSubs;
  const total = rows.length;

  useEffect(() => {
    setPage(1);
  }, [p.search, p.filter, p.subSort, total, p.isGroupMode]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const emptyMsg =
    p.search.trim() || p.filter !== 'all'
      ? `No ${p.isGroupMode ? 'groups' : 'students'} match your filters.`
      : p.isGroupMode
        ? p.groupsEmpty
          ? 'No groups created yet — go to the Groups tab first.'
          : 'No submissions yet.'
        : p.rosterEmpty
          ? 'No students enrolled yet.'
          : 'No submissions yet.';

  if (p.loading) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border border-border bg-card'>
        <div className='border-primary size-8 animate-spin rounded-full border-4 border-t-transparent' />
      </div>
    );
  }

  return (
    <PosTableCard
      search={p.search}
      onSearchChange={p.onSearchChange}
      searchPlaceholder={p.isGroupMode ? 'Search groups…' : 'Search students…'}
      columns={[...columnOpts]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={SUBMISSION_SORT_OPTS}
      sortId={sortIdFromSubSort(p.subSort)}
      onSortChange={(id) => p.onSortChange(subSortFromId(id))}
      onExportExcel={p.onExport}
      toolbarEnd={
        <SegmentedControl
          ariaLabel='Filter submissions by status'
          value={p.filter}
          onChange={p.onFilterChange}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'submitted', label: 'Submitted', count: counts.submitted },
            { value: 'late', label: 'Late', count: counts.late },
            { value: 'missing', label: 'Missing', count: counts.missing },
            { value: 'ungraded', label: 'Ungraded', count: counts.ungraded },
            { value: 'graded', label: 'Graded', count: counts.graded }
          ]}
        />
      }
      footer={
        total > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel={p.isGroupMode ? 'groups' : 'students'}
          />
        ) : null
      }
    >
      {total === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium text-foreground'>{emptyMsg}</p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              <PosTableHeaderCell className={`w-10 ${headerBlack}`} />
              {col('name') ? (
                <PosTableHeaderCell className={headerBlack}>
                  {p.isGroupMode ? 'Group' : 'Student'}
                </PosTableHeaderCell>
              ) : null}
              {p.isGroupMode && col('members') ? (
                <PosTableHeaderCell className={headerBlack}>Members</PosTableHeaderCell>
              ) : null}
              {col('submitted') ? (
                <PosTableHeaderCell className={headerBlack}>Submitted</PosTableHeaderCell>
              ) : null}
              {!p.isGroupMode && col('due') ? (
                <PosTableHeaderCell className={headerBlack}>Effective due</PosTableHeaderCell>
              ) : null}
              {col('status') ? (
                <PosTableHeaderCell className={headerBlack}>Status</PosTableHeaderCell>
              ) : null}
              {col('grade') ? (
                <PosTableHeaderCell className={headerBlack}>Grade</PosTableHeaderCell>
              ) : null}
              {col('file') ? (
                <PosTableHeaderCell className={headerBlack}>File</PosTableHeaderCell>
              ) : null}
              <PosTableHeaderCell align='right' className={headerBlack}>
                Action
              </PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {p.isGroupMode
              ? (pageRows as GroupRow[]).map((row) => (
                  <GroupSubmissionRow
                    key={row.groupId}
                    row={row}
                    assignment={p.assignment}
                    extensions={p.extensions}
                    col={col}
                    selected={p.selectedRows.has(row.groupId)}
                    onToggle={p.onToggleRow}
                    onGrade={p.onGrade}
                    onExtendMissing={p.onExtendMissing}
                  />
                ))
              : (pageRows as SubmissionRow[]).map((row) => (
                  <StudentSubmissionRow
                    key={row.studentId}
                    row={row}
                    col={col}
                    assignment={p.assignment}
                    extensions={p.extensions}
                    selected={p.selectedRows.has(row.studentId)}
                    onToggle={p.onToggleRow}
                    onGrade={p.onGrade}
                    onEnterMarks={p.onEnterMarks}
                    onExtendMissing={p.onExtendMissing}
                  />
                ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
