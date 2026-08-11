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
import { useAdminBatches } from '@/lib/batches-admin/queries';
import {
  BATCH_ALL_COLS,
  BATCH_COLUMN_OPTS,
  BATCH_SORT_OPTS,
  exportBatchesCsv,
  exportBatchesPdf,
  sortBatches
} from '@/lib/batches-admin/services/batches-table-utils';
import { BatchTableRow } from './batch-table-row';

export function BatchesAdminTable() {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('name-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...BATCH_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading, error } = useAdminBatches();
  const batches = data?.batches ?? [];
  const col = (id: string) => visibleCols.includes(id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = !q
      ? batches
      : batches.filter((batch) => {
          const hay = [
            batch.name,
            batch.program?.name,
            batch.program?.code,
            batch.academicYear?.name,
            String(batch.cohortSemester ?? batch.semester_number)
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        });
    return sortBatches(matched, sortId);
  }, [batches, search, sortId]);

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
        <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
        Failed to load batches: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search...'
      columns={[...BATCH_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={BATCH_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportBatchesCsv(filtered);
        showToast('success', 'Exported batches.csv');
      }}
      onExportPdf={() => exportBatchesPdf(filtered)}
      footer={
        filtered.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='batches'
          />
        ) : null
      }
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{batches.length === 0 ? 'No batches yet' : 'No matches'}</p>
          <p className='text-muted-foreground mt-1 text-sm'>
            {batches.length === 0
              ? 'Create a batch, then add sections for student registration.'
              : 'Try a different search.'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('id') ? <PosTableHeaderCell>ID</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Batch Name</PosTableHeaderCell> : null}
              {col('program') ? <PosTableHeaderCell>Program</PosTableHeaderCell> : null}
              {col('intake') ? <PosTableHeaderCell>Intake</PosTableHeaderCell> : null}
              {col('semester') ? <PosTableHeaderCell>Semester</PosTableHeaderCell> : null}
              {col('status') ? <PosTableHeaderCell>Status</PosTableHeaderCell> : null}
              <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((batch) => (
              <BatchTableRow key={batch.id} batch={batch} col={col} />
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
