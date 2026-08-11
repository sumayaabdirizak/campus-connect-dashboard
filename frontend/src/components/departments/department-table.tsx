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
import { useDepartments } from '@/lib/departments/queries';
import {
  DEPT_ALL_COLS,
  DEPT_COLUMN_OPTS,
  DEPT_SORT_OPTS,
  exportDepartmentsCsv,
  exportDepartmentsPdf,
  sortDepartments
} from '@/lib/departments/services/departments-table-utils';
import { DepartmentTableRow } from './department-table-row';

export function DepartmentTable() {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('name-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...DEPT_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading, error } = useDepartments();
  const departments = data?.departments || [];
  const col = (id: string) => visibleCols.includes(id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = !q
      ? departments
      : departments.filter((d) =>
          [d.name, d.code, d.faculty?.name].filter(Boolean).join(' ').toLowerCase().includes(q)
        );
    return sortDepartments(matched, sortId);
  }, [departments, search, sortId]);

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
        Failed to load departments: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      columns={[...DEPT_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={DEPT_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportDepartmentsCsv(filtered);
        showToast('success', 'Exported departments.csv');
      }}
      onExportPdf={() => exportDepartmentsPdf(filtered)}
      footer={
        filtered.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='departments'
          />
        ) : null
      }
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>
            {departments.length === 0 ? 'No departments yet' : 'No matches'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('id') ? <PosTableHeaderCell>ID</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Department</PosTableHeaderCell> : null}
              {col('code') ? <PosTableHeaderCell>Code</PosTableHeaderCell> : null}
              {col('faculty') ? <PosTableHeaderCell>Faculty</PosTableHeaderCell> : null}
              {col('levels') ? <PosTableHeaderCell>Program levels</PosTableHeaderCell> : null}
              {col('created') ? <PosTableHeaderCell>Created</PosTableHeaderCell> : null}
              <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((dept) => (
              <DepartmentTableRow key={dept.id} department={dept} col={col} />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
