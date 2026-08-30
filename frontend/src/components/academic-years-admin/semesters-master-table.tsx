'use client';

import { useEffect, useMemo, useState } from 'react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import {
  PosTable,
  PosTableBody,
  PosTableCell,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import { useQuery } from '@/lib/async-query';
import { showToast } from '@/lib/notifications';
import { fetchAllSemesters } from '@/lib/academic-years-admin/services';
import { formatDisplayDate } from '@/lib/academic-years-admin/services/format-dates';
import {
  SEM_ALL_COLS,
  SEM_COLUMN_OPTS,
  SEM_SORT_OPTS,
  exportSemestersCsv,
  exportSemestersPdf,
  sortSemesters
} from '@/lib/academic-years-admin/services/years-table-utils';

export function SemestersMasterTable() {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('seq-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...SEM_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: semesters = [], isLoading, error } = useQuery({
    queryKey: ['admin-semesters-flat'],
    queryFn: () => fetchAllSemesters(true)
  });
  const col = (id: string) => visibleCols.includes(id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = !q
      ? semesters
      : semesters.filter((s) =>
          [s.name, s.academicYear?.name, String(s.sequence)]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
        );
    return sortSemesters(matched, sortId);
  }, [semesters, search, sortId]);

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
        Failed to load semesters: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      columns={[...SEM_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={SEM_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportSemestersCsv(filtered);
        showToast('success', 'Exported semesters.csv');
      }}
      onExportPdf={() => exportSemestersPdf(filtered)}
      footer={
        filtered.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='semesters'
          />
        ) : null
      }
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>
            {semesters.length === 0 ? 'No semesters yet' : 'No matches'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('sequence') ? <PosTableHeaderCell>#</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Name</PosTableHeaderCell> : null}
              {col('year') ? <PosTableHeaderCell>Academic year</PosTableHeaderCell> : null}
              {col('dates') ? <PosTableHeaderCell>Dates</PosTableHeaderCell> : null}
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((semester) => (
              <PosTableRow key={semester.id}>
                {col('sequence') ? (
                  <PosTableCell>
                    <span className='font-medium text-primary'>#{semester.sequence}</span>
                  </PosTableCell>
                ) : null}
                {col('name') ? (
                  <PosTableCell>
                    <p className='text-sm font-medium'>{semester.name}</p>
                  </PosTableCell>
                ) : null}
                {col('year') ? (
                  <PosTableCell>
                    <span className='text-muted-foreground text-sm'>
                      {semester.academicYear?.name ?? '—'}
                    </span>
                  </PosTableCell>
                ) : null}
                {col('dates') ? (
                  <PosTableCell>
                    <span className='text-muted-foreground text-sm'>
                      {formatDisplayDate(semester.start_date)} –{' '}
                      {formatDisplayDate(semester.end_date)}
                    </span>
                  </PosTableCell>
                ) : null}
              </PosTableRow>
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
