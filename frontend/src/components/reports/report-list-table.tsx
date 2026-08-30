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
import type { ReportScope } from '@/lib/reports/types';
import { labelForColumn } from './report-table-labels';
import { REPORT_SCOPE_COLUMNS } from './report-scope-columns';
import { ReportListRowActions } from './report-list-row-actions';

const NUMERIC = new Set([
  'departments', 'clubs', 'sections', 'students', 'courses',
  'quizzes', 'assignments', 'resources', 'posts', 'attempts', 'submissions'
]);

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  INACTIVE: 'bg-muted text-muted-foreground'
};

function sortIdFromSort(sort: { key: string; dir: 'asc' | 'desc' } | null): string {
  return sort ? `${sort.key}-${sort.dir}` : '';
}

function parseSortId(id: string): { key: string; dir: 'asc' | 'desc' } {
  const lastDash = id.lastIndexOf('-');
  if (lastDash <= 0) return { key: id, dir: 'asc' };
  return {
    key: id.slice(0, lastDash),
    dir: id.slice(lastDash + 1) === 'desc' ? 'desc' : 'asc'
  };
}

function rowId(row: Record<string, unknown>): string | null {
  const raw = row.id;
  if (raw === null || raw === undefined || raw === '') return null;
  return String(raw);
}

function rowLabel(row: Record<string, unknown>): string {
  const v = row.name ?? row.title ?? row.course ?? row.id;
  return v != null ? String(v) : 'subject';
}

function buildSortOpts(columns: string[]) {
  return columns.flatMap((c) => {
    const label = labelForColumn(c);
    if (NUMERIC.has(c)) {
      return [
        { id: `${c}-desc`, label: `${label} (high first)` },
        { id: `${c}-asc`, label: `${label} (low first)` }
      ];
    }
    return [
      { id: `${c}-asc`, label: `${label} A–Z` },
      { id: `${c}-desc`, label: `${label} Z–A` }
    ];
  });
}

export function ReportListTable({
  scope,
  noun,
  plural,
  rows,
  isFetching = false,
  onOpen,
  toolbarStart,
  search,
  onSearchChange,
  searchPlaceholder,
  isSearching = false,
  sort,
  onSortChange,
  page,
  pageSize,
  total,
  totalUnfiltered,
  onPageChange,
  onPageSizeChange,
  onExportPdf,
  onExportExcel
}: {
  scope: ReportScope;
  noun: string;
  plural: string;
  rows: Record<string, unknown>[];
  isFetching?: boolean;
  onOpen: (id: string) => void;
  toolbarStart?: React.ReactNode;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  isSearching?: boolean;
  sort: { key: string; dir: 'asc' | 'desc' } | null;
  onSortChange: (sort: { key: string; dir: 'asc' | 'desc' }) => void;
  page: number;
  pageSize: number;
  total: number;
  totalUnfiltered: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
}) {
  const columns = useMemo(() => {
    if (rows.length > 0) {
      return Object.keys(rows[0]).filter((c) => c !== 'id');
    }
    return REPORT_SCOPE_COLUMNS[scope];
  }, [rows, scope]);

  const [visibleCols, setVisibleCols] = useState<string[]>(columns);

  useEffect(() => {
    setVisibleCols(columns);
  }, [columns.join('|')]);

  const columnOpts = useMemo(
    () => columns.map((c) => ({ id: c, label: labelForColumn(c) })),
    [columns]
  );
  const sortOpts = useMemo(() => buildSortOpts(columns), [columns]);
  const col = (id: string) => visibleCols.includes(id);

  return (
    <PosTableCard
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder ?? `Search ${plural}…`}
      columns={columnOpts}
      visibleColumnIds={visibleCols}
      onVisibleColumnsChange={setVisibleCols}
      sortOptions={sortOpts}
      sortId={sortIdFromSort(sort)}
      onSortChange={(id) => onSortChange(parseSortId(id))}
      onExportPdf={onExportPdf}
      onExportExcel={onExportExcel}
      toolbarStart={toolbarStart}
      footer={
        total > 0 ? (
          <PosTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            itemLabel={total === 1 ? noun : plural}
          />
        ) : null
      }
    >
      <div className={isFetching || isSearching ? 'opacity-60 transition-opacity' : undefined}>
      {rows.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>
            {totalUnfiltered === 0 ? 'Nothing to report on yet' : 'No matches'}
          </p>
          <p className='mt-1 text-sm text-muted-foreground'>
            {totalUnfiltered === 0
              ? 'Activity will appear here as courses are used.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              {columns.map((c) =>
                col(c) ? (
                  <PosTableHeaderCell
                    key={c}
                    align={NUMERIC.has(c) ? 'right' : 'left'}
                  >
                    {labelForColumn(c)}
                  </PosTableHeaderCell>
                ) : null
              )}
              <PosTableHeaderCell
                align='right'
                className='sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]'
                style={{ backgroundColor: 'var(--muted)' }}
              >
                Action
              </PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {rows.map((row, i) => {
              const id = rowId(row);
              const label = rowLabel(row);
              const openRow = () => {
                if (id) onOpen(id);
              };
              return (
              <PosTableRow
                key={id ?? `row-${i}`}
                className={id ? 'cursor-pointer' : undefined}
                onClick={id ? openRow : undefined}
              >
                {columns.map((c) => {
                  if (!col(c)) return null;
                  const v = row[c];
                  const isName = c === 'name' || c === 'title' || c === 'course';
                  return (
                    <PosTableCell
                      key={c}
                      align={NUMERIC.has(c) ? 'right' : 'left'}
                      className={isName ? 'font-medium' : undefined}
                    >
                      {c === 'status' ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_TONE[String(v)] ?? 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {String(v)}
                        </span>
                      ) : typeof v === 'number' && v === 0 ? (
                        <span className='text-muted-foreground'>0</span>
                      ) : (
                        String(v ?? '—')
                      )}
                    </PosTableCell>
                  );
                })}
                <PosTableCell
                  align='right'
                  className='sticky right-0 z-10 bg-card shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]'
                >
                  {id ? (
                    <ReportListRowActions label={label} onView={openRow} />
                  ) : (
                    <span className='text-muted-foreground'>—</span>
                  )}
                </PosTableCell>
              </PosTableRow>
              );
            })}
          </PosTableBody>
        </PosTable>
      )}
      </div>
    </PosTableCard>
  );
}
