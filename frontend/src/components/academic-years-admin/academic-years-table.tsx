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
import { useAdminAcademicYearsList } from '@/lib/academic-years-admin/queries';
import {
  YEAR_ALL_COLS,
  YEAR_COLUMN_OPTS,
  YEAR_SORT_OPTS,
  exportYearsCsv,
  exportYearsPdf,
  sortYears
} from '@/lib/academic-years-admin/services/years-table-utils';
import { AcademicYearTableRow } from './academic-year-table-row';

export function AcademicYearsTable() {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('name-desc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...YEAR_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: years = [], isLoading, error } = useAdminAcademicYearsList();
  const col = (id: string) => visibleCols.includes(id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = !q
      ? years
      : years.filter((y) => y.name.toLowerCase().includes(q));
    return sortYears(matched, sortId);
  }, [years, search, sortId]);

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
        Failed to load academic years: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      columns={[...YEAR_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={YEAR_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportYearsCsv(filtered);
        showToast('success', 'Exported academic-years.csv');
      }}
      onExportPdf={() => exportYearsPdf(filtered)}
      footer={
        filtered.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='years'
          />
        ) : null
      }
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{years.length === 0 ? 'No academic years yet' : 'No matches'}</p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('id') ? <PosTableHeaderCell>ID</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Academic Year</PosTableHeaderCell> : null}
              {col('dates') ? <PosTableHeaderCell>Dates</PosTableHeaderCell> : null}
              {col('semesters') ? <PosTableHeaderCell>Semesters</PosTableHeaderCell> : null}
              {col('batches') ? <PosTableHeaderCell>Batches</PosTableHeaderCell> : null}
              {col('status') ? <PosTableHeaderCell>Status</PosTableHeaderCell> : null}
              <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((year) => (
              <AcademicYearTableRow key={year.id} year={year} col={col} />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
