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
import { AcademicScopeFilters } from '@/components/academic/academic-scope-filters';
import { showToast } from '@/lib/notifications';
import { useAdminBatches, useAdminBatchSections } from '@/lib/batches-admin/queries';
import {
  SECTION_ALL_COLS,
  SECTION_COLUMN_OPTS,
  SECTION_SORT_OPTS,
  exportSectionsCsv,
  exportSectionsPdf,
  sortSections
} from '@/lib/batches-admin/services/sections-table-utils';
import { SectionRowActions } from './section-row-actions';

export function SectionsAdminTable({
  facultyId,
  departmentId,
  programId
}: {
  facultyId?: string;
  departmentId?: string;
  programId?: string;
} = {}) {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('name-asc');
  const [visibleCols, setVisibleCols] = useState<string[]>([...SECTION_ALL_COLS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: sections = [], isLoading, error } = useAdminBatchSections();
  const { data: batchesData } = useAdminBatches({
    facultyId,
    departmentId,
    programId
  });
  const col = (id: string) => visibleCols.includes(id);

  const scopedBatchIds = useMemo(() => {
    if (!facultyId && !departmentId && !programId) return null;
    return new Set((batchesData?.batches ?? []).map((b) => b.id));
  }, [batchesData?.batches, facultyId, departmentId, programId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = sections.filter((section) => {
      if (scopedBatchIds && !scopedBatchIds.has(section.batchId)) return false;
      if (!q) return true;
      const hay = [section.name, section.batch?.name, String(section.batchId), String(section.id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    return sortSections(matched, sortId);
  }, [sections, search, sortId, scopedBatchIds]);

  useEffect(() => {
    setPage(1);
  }, [search, sortId, facultyId, departmentId, programId]);

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
        Failed to load sections: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search...'
      toolbarStart={<AcademicScopeFilters />}
      columns={[...SECTION_COLUMN_OPTS]}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={SECTION_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportSectionsCsv(filtered);
        showToast('success', 'Exported sections.csv');
      }}
      onExportPdf={() => exportSectionsPdf(filtered)}
      footer={
        filtered.length > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel='sections'
          />
        ) : null
      }
    >
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{sections.length === 0 ? 'No sections yet' : 'No matches'}</p>
          <p className='text-muted-foreground mt-1 text-sm'>
            {sections.length === 0
              ? 'Add a section to a batch from the Sections tab.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {col('id') ? <PosTableHeaderCell>ID</PosTableHeaderCell> : null}
              {col('name') ? <PosTableHeaderCell>Section</PosTableHeaderCell> : null}
              {col('batch') ? <PosTableHeaderCell>Batch</PosTableHeaderCell> : null}
              {col('batchId') ? <PosTableHeaderCell>Batch ID</PosTableHeaderCell> : null}
              <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {pageRows.map((section) => (
              <PosTableRow key={section.id}>
                {col('id') ? (
                  <PosTableCell>
                    <span className='font-medium text-primary'>#{section.id}</span>
                  </PosTableCell>
                ) : null}
                {col('name') ? (
                  <PosTableCell>
                    <p className='text-sm font-medium'>{section.name}</p>
                  </PosTableCell>
                ) : null}
                {col('batch') ? (
                  <PosTableCell>{section.batch?.name ?? `Batch #${section.batchId}`}</PosTableCell>
                ) : null}
                {col('batchId') ? (
                  <PosTableCell>
                    <span className='text-muted-foreground'>#{section.batchId}</span>
                  </PosTableCell>
                ) : null}
                <PosTableCell align='right'>
                  <SectionRowActions section={section} />
                </PosTableCell>
              </PosTableRow>
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
