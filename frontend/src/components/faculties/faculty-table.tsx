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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useQuery } from '@/lib/async-query';
import { showToast } from '@/lib/notifications';
import { facultiesQueryOptions } from '@/lib/faculties/queries';
import {
  FACULTY_ALL_COLS,
  FACULTY_COLUMN_OPTS,
  FACULTY_SORT_OPTS,
  exportFacultiesCsv,
  exportFacultiesPdf,
  sortFaculties,
  type FacultyRow
} from '@/lib/faculties/services/faculties-table-utils';
import { FacultyTableRow } from './faculty-table-row';

export function FacultyTable() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortId, setSortId] = useState('name-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...FACULTY_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading, error } = useQuery(facultiesQueryOptions());
  const col = (id: string) => visibleCols.includes(id);

  const faculties: FacultyRow[] =
    data && typeof data === 'object' && 'faculties' in data
      ? (data as { faculties: FacultyRow[] }).faculties
      : Array.isArray(data)
        ? (data as FacultyRow[])
        : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = faculties.filter((f) => {
      const raw = String(f.status ?? 'active').toLowerCase();
      if (status !== 'all' && raw !== status) return false;
      if (!q) return true;
      return [f.name, f.code, String(f.defaultDurationYears ?? 4)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    return sortFaculties(matched, sortId);
  }, [faculties, search, sortId, status]);

  useEffect(() => {
    setPage(1);
  }, [search, sortId, status]);

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
        Failed to load faculties: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      toolbarStart={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className='h-9 w-auto min-w-[8rem] text-xs'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All statuses</SelectItem>
            <SelectItem value='active'>Active</SelectItem>
            <SelectItem value='inactive'>Inactive</SelectItem>
          </SelectContent>
        </Select>
      }
      columns={[...FACULTY_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={FACULTY_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportFacultiesCsv(filtered);
        showToast('success', 'Exported faculties.csv');
      }}
      onExportPdf={() => exportFacultiesPdf(filtered)}
      footer={
        filtered.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='faculties'
          />
        ) : null
      }
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{faculties.length === 0 ? 'No faculties yet' : 'No matches'}</p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('id') ? <PosTableHeaderCell>ID</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Faculty</PosTableHeaderCell> : null}
              {col('code') ? <PosTableHeaderCell>Code</PosTableHeaderCell> : null}
              {col('duration') ? <PosTableHeaderCell>Duration</PosTableHeaderCell> : null}
              {col('departments') ? <PosTableHeaderCell>Departments</PosTableHeaderCell> : null}
              {col('created') ? <PosTableHeaderCell>Created</PosTableHeaderCell> : null}
              <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((fac) => (
              <FacultyTableRow key={fac.id} faculty={fac} col={col} />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
