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
import { showToast } from '@/lib/notifications';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import {
  ASSIGNMENT_ALL_COLS,
  ASSIGNMENT_COLUMN_OPTS,
  ASSIGNMENT_SORT_OPTS,
  exportAssignmentsCsv,
  sortAssignments
} from './assignments-table-utils';
import { AssignmentListRow } from './assignment-list-row';

interface AssignmentListTableProps {
  assignments: Assignment[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onOpenSubmissions: (a: Assignment) => void;
  onTogglePublish: (a: Assignment) => void;
  onEdit: (a: Assignment) => void;
  onDelete: (id: number) => void;
}

export function AssignmentListTable({
  assignments,
  isLoading,
  search,
  onSearchChange,
  selectedIds,
  onToggleSelect,
  onOpenSubmissions,
  onTogglePublish,
  onEdit,
  onDelete
}: AssignmentListTableProps) {
  const [sortId, setSortId] = useState('due-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...ASSIGNMENT_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const col = (id: string) => visibleCols.includes(id);

  const sorted = useMemo(
    () => sortAssignments(assignments, sortId),
    [assignments, sortId]
  );

  useEffect(() => {
    setPage(1);
  }, [search, sortId, assignments.length]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

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
      onSearchChange={onSearchChange}
      searchPlaceholder='Search title or instructions…'
      columns={[...ASSIGNMENT_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={ASSIGNMENT_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportAssignmentsCsv(sorted);
        showToast('success', 'Exported assignments.csv');
      }}
      footer={
        sorted.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={sorted.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='assignments'
          />
        ) : null
      }
    >
      {sorted.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium text-foreground'>
            {assignments.length === 0 ? 'No assignments yet' : 'No matches'}
          </p>
          <p className='mt-1 text-sm text-muted-foreground'>
            Try another filter or search term.
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              <PosTableHeaderCell className='w-10 !text-foreground' />
              {col('title') ? (
                <PosTableHeaderCell className='!text-foreground'>Title</PosTableHeaderCell>
              ) : null}
              {col('work') ? (
                <PosTableHeaderCell className='!text-foreground'>Work</PosTableHeaderCell>
              ) : null}
              {col('grading') ? (
                <PosTableHeaderCell className='!text-foreground'>Grading</PosTableHeaderCell>
              ) : null}
              {col('opens') ? (
                <PosTableHeaderCell className='!text-foreground'>Opens</PosTableHeaderCell>
              ) : null}
              {col('due') ? (
                <PosTableHeaderCell className='!text-foreground'>Due</PosTableHeaderCell>
              ) : null}
              {col('submissions') ? (
                <PosTableHeaderCell align='right' className='!text-foreground'>
                  Submissions
                </PosTableHeaderCell>
              ) : null}
              <PosTableHeaderCell align='right' className='!text-foreground'>
                Action
              </PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((a) => (
              <AssignmentListRow
                key={a.id}
                assignment={a}
                col={col}
                isSelected={selectedIds.has(a.id)}
                onToggleSelect={onToggleSelect}
                onOpenSubmissions={onOpenSubmissions}
                onTogglePublish={onTogglePublish}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
