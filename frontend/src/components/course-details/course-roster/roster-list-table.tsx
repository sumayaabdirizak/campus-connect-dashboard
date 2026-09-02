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
import type { RosterRow } from './helpers';
import { RosterListRow } from './roster-list-row';
import { exportRosterCsv, ROSTER_SORT_OPTS, sortRosterRows } from './roster-table-utils';

interface RosterListTableProps {
  courseId: string;
  rows: RosterRow[];
  search: string;
  onSearchChange: (value: string) => void;
  onRowClick?: (row: RosterRow) => void;
}

export function RosterListTable({
  courseId,
  rows,
  search,
  onSearchChange,
  onRowClick
}: RosterListTableProps) {
  const [sortId, setSortId] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sorted = useMemo(() => sortRosterRows(rows, sortId), [rows, sortId]);

  useEffect(() => {
    setPage(1);
  }, [search, sortId, rows.length]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  return (
    <PosTableCard
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder='Search students…'
      sortOptions={ROSTER_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportRosterCsv(sorted, courseId);
        showToast('success', `Exported roster-${courseId}.csv`);
      }}
      footer={
        sorted.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={sorted.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='students'
          />
        ) : null
      }
    >
      {sorted.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium text-foreground'>
            {rows.length === 0 ? 'No students yet' : 'No matches'}
          </p>
          <p className='mt-1 text-sm text-muted-foreground'>
            Try another search term.
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              <PosTableHeaderCell className='!text-foreground uppercase tracking-wide text-xs'>
                Student
              </PosTableHeaderCell>
              <PosTableHeaderCell className='!text-foreground uppercase tracking-wide text-xs'>
                Student ID
              </PosTableHeaderCell>
              <PosTableHeaderCell className='!text-foreground uppercase tracking-wide text-xs'>
                Last seen
              </PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((row) => (
              <RosterListRow key={row.id} row={row} onRowClick={onRowClick} />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
