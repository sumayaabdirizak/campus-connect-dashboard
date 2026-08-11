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
import { usePrograms } from '@/lib/programs/queries';
import {
  PROGRAM_ALL_COLS,
  PROGRAM_COLUMN_OPTS,
  PROGRAM_SORT_OPTS,
  exportProgramsCsv,
  exportProgramsPdf,
  sortPrograms
} from '@/lib/programs/services';
import { ProgramTableRow } from './program-table-row';

export function ProgramsTable() {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('name-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...PROGRAM_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading, error } = usePrograms();
  const programs = data?.programs || [];
  const col = (id: string) => visibleCols.includes(id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = !q
      ? programs
      : programs.filter((p) =>
          [p.name, p.code, p.level, p.department?.name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
        );
    return sortPrograms(matched, sortId);
  }, [programs, search, sortId]);

  useEffect(() => {
    setPage(1);
  }, [search, sortId]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  if (isLoading) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
        <div className='border-primary size-8 animate-spin rounded-full border-4 border-t-transparent' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
        Failed to load programs: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      columns={[...PROGRAM_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={PROGRAM_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportProgramsCsv(filtered);
        showToast('success', 'Exported programs.csv');
      }}
      onExportPdf={() => exportProgramsPdf(filtered)}
      footer={
        filtered.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='programs'
          />
        ) : null
      }
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{programs.length === 0 ? 'No programs yet' : 'No matches'}</p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('id') ? <PosTableHeaderCell>ID</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Program Name</PosTableHeaderCell> : null}
              {col('code') ? <PosTableHeaderCell>Code</PosTableHeaderCell> : null}
              {col('level') ? <PosTableHeaderCell>Level</PosTableHeaderCell> : null}
              {col('duration') ? <PosTableHeaderCell>Duration</PosTableHeaderCell> : null}
              {col('department') ? <PosTableHeaderCell>Department</PosTableHeaderCell> : null}
              {col('created') ? <PosTableHeaderCell>Created</PosTableHeaderCell> : null}
              <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((p) => (
              <ProgramTableRow key={p.id} program={p} col={col} />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
