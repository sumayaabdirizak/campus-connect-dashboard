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
import { useOffices } from '@/lib/offices/queries';
import type { SupportOffice } from '@/lib/offices/types';
import {
  OFFICE_ALL_COLS,
  OFFICE_COLUMN_OPTS,
  OFFICE_SORT_OPTS,
  exportOfficesCsv,
  exportOfficesPdf,
  sortOffices
} from '@/lib/offices/services';
import { OfficeTableRow } from './office-table-row';

export function OfficesAdminTable({
  onManageStaff,
  onEdit
}: {
  onManageStaff: (office: SupportOffice) => void;
  onEdit: (office: SupportOffice) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('name-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...OFFICE_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: offices = [], isLoading, error } = useOffices({
    includeInactive: true,
    scope: 'manage'
  });
  const col = (id: string) => visibleCols.includes(id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = !q
      ? offices
      : offices.filter((o) =>
          [o.name, o.slug, o.codePrefix, o.description]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
        );
    return sortOffices(matched, sortId);
  }, [offices, search, sortId]);

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
        Failed to load offices: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      columns={[...OFFICE_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={OFFICE_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportOfficesCsv(filtered);
        showToast('success', 'Exported offices.csv');
      }}
      onExportPdf={() => exportOfficesPdf(filtered)}
      footer={
        filtered.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='offices'
          />
        ) : null
      }
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>
            {offices.length === 0 ? 'No offices yet' : 'No matches'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('id') ? <PosTableHeaderCell>ID</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Office</PosTableHeaderCell> : null}
              {col('slug') ? <PosTableHeaderCell>Slug</PosTableHeaderCell> : null}
              {col('prefix') ? <PosTableHeaderCell>Prefix</PosTableHeaderCell> : null}
              {col('status') ? <PosTableHeaderCell>Status</PosTableHeaderCell> : null}
              {col('description') ? <PosTableHeaderCell>Description</PosTableHeaderCell> : null}
              {col('created') ? <PosTableHeaderCell>Created</PosTableHeaderCell> : null}
              <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((office) => (
              <OfficeTableRow
                key={office.id}
                office={office}
                col={col}
                onManageStaff={onManageStaff}
                onEdit={onEdit}
              />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
