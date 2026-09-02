'use client';

import { useEffect, useMemo, useState } from 'react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';
import type { Gradebook, GradebookRow } from '@/lib/course-details/services/gradebook-types';
import { exportGradebookCsv } from './export-csv';
import { GradebookTable } from './gradebook-table';
import { type GradeFilter, rowNeedsGrading } from './gradebook-math';
import { GRADEBOOK_SORT_OPTS, sortGradebookRows } from './gradebook-table-utils';

interface GradebookListTableProps {
  data: Gradebook;
  onRowClick: (row: GradebookRow) => void;
}

export function GradebookListTable({ data, onRowClick }: GradebookListTableProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GradeFilter>('all');
  const [sortId, setSortId] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const needsGradingCount = useMemo(
    () => data.students.filter((r) => rowNeedsGrading(r, data.columns)).length,
    [data]
  );

  const filtered = useMemo(() => {
    let rows = data.students;
    if (filter === 'needs_grading') {
      rows = rows.filter((r) => rowNeedsGrading(r, data.columns));
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.number ?? '').toLowerCase().includes(q)
    );
  }, [data, search, filter]);

  const sorted = useMemo(() => sortGradebookRows(filtered, sortId), [filtered, sortId]);

  useEffect(() => {
    setPage(1);
  }, [search, sortId, filter, data.students.length]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const filters: { id: GradeFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: data.studentCount },
    { id: 'needs_grading', label: 'To grade', count: needsGradingCount }
  ];

  const filterLabel = filter === 'needs_grading' ? 'the to-grade filter' : 'this filter';

  return (
    <PosTableCard
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder='Search students…'
      sortOptions={GRADEBOOK_SORT_OPTS}
      sortId={sortId}
      onSortChange={setSortId}
      onExportExcel={() => {
        exportGradebookCsv(data, sorted);
        showToast('success', 'Exported gradebook.csv');
      }}
      toolbarStart={
        <div className='flex items-center gap-1 rounded-full border border-border bg-card p-0.5'>
          {filters.map((f) => (
            <button
              key={f.id}
              type='button'
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition-colors',
                filter === f.id
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
              {f.count > 0 ? (
                <span
                  className={cn(
                    'ml-1 tabular-nums',
                    filter === f.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {f.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      }
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
          <p className='font-medium text-foreground'>No matches</p>
          <p className='mt-1 text-sm text-muted-foreground'>
            Try another search term or filter.
          </p>
        </div>
      ) : (
        <GradebookTable
          data={data}
          rows={pageRows}
          search={search}
          filterLabel={filterLabel}
          onRowClick={onRowClick}
        />
      )}
    </PosTableCard>
  );
}
