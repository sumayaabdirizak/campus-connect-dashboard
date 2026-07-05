'use client';

import { useMemo, useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ArrowUpDown, ChevronDown, ChevronUp, Download, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleDataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  searchPlaceholder?: string;
  csvFileName?: string;
  initialSorting?: SortingState;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  toolbarRight?: React.ReactNode;
  mobilePrimaryColumn?: string | false;
  /** Hide built-in search/export toolbar (e.g. when parent shell provides it). */
  hideToolbar?: boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  /** Sticky column headers while the table body scrolls. Default true. */
  stickyHeader?: boolean;
  /** Classes for the scrollable table region. */
  scrollContainerClassName?: string;
  /** Tighter layout when nested inside CoursePageShell. */
  embedded?: boolean;
}

export function SimpleDataTable<TData>({
  data,
  columns,
  searchPlaceholder = 'Search…',
  csvFileName,
  initialSorting = [],
  pageSize = 25,
  onRowClick,
  toolbarRight,
  mobilePrimaryColumn,
  hideToolbar = false,
  globalFilter: globalFilterProp,
  onGlobalFilterChange,
  stickyHeader = true,
  scrollContainerClassName,
  embedded = false
}: SimpleDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [internalFilter, setInternalFilter] = useState('');
  const globalFilter = globalFilterProp ?? internalFilter;
  const setGlobalFilter = onGlobalFilterChange ?? setInternalFilter;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination: { pageIndex: 0, pageSize } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } }
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const headerGroups = table.getHeaderGroups();
  const visibleRows = table.getRowModel().rows;

  const handleExport = useMemo(() => {
    if (!csvFileName) return null;
    return () => {
      const cols = table.getAllLeafColumns().filter((c) => c.getIsVisible());
      const header = cols.map((c) =>
        typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id
      );
      const rows = filteredRows.map((r) =>
        cols.map((c) => {
          const v = r.getValue(c.id);
          if (v == null) return '';
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            return v;
          }
          return String(v);
        })
      );
      const escape = (val: unknown) => `"${String(val).replace(/"/g, '""')}"`;
      const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${csvFileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
  }, [csvFileName, filteredRows, table]);

  const stickyHeadClass = stickyHeader
    ? 'sticky top-0 z-30 bg-card shadow-[inset_0_-1px_0_0_hsl(var(--border))]'
    : undefined;

  return (
    <div className={cn(!embedded && 'space-y-3')}>
      {!hideToolbar && (
        <div className='flex flex-wrap items-center gap-2'>
          <div className='relative min-w-[180px] max-w-xs flex-1'>
            <Search
              className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
              aria-hidden
            />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className='h-9 pl-9'
              aria-label={searchPlaceholder}
            />
          </div>
          {toolbarRight}
          {handleExport && (
            <Button
              variant='outline'
              size='sm'
              className='ml-auto gap-1.5'
              onClick={handleExport}
            >
              <Download className='size-4' aria-hidden />
              Export CSV
            </Button>
          )}
        </div>
      )}

      {mobilePrimaryColumn !== false && (
        <div className='space-y-2 md:hidden'>
          {visibleRows.length === 0 ? (
            <div className='rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground'>
              No results.
            </div>
          ) : (
            visibleRows.map((row) => {
              const leaves = table.getAllLeafColumns().filter((c) => c.getIsVisible());
              const primaryId =
                typeof mobilePrimaryColumn === 'string' ? mobilePrimaryColumn : leaves[0]?.id;
              const primaryCell = row
                .getVisibleCells()
                .find((c) => c.column.id === primaryId);
              const rest = row.getVisibleCells().filter((c) => c.column.id !== primaryId);
              return (
                <div
                  key={row.id}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                  onClick={() => onRowClick?.(row.original)}
                  className='w-full rounded-lg border p-3 text-left'
                >
                  {primaryCell && (
                    <div className='text-sm font-medium'>
                      {flexRender(primaryCell.column.columnDef.cell, primaryCell.getContext())}
                    </div>
                  )}
                  <div className='mt-2 space-y-1'>
                    {rest.map((cell) => {
                      const header = cell.column.columnDef.header;
                      const headerText =
                        typeof header === 'string' ? header : cell.column.id;
                      return (
                        <div
                          key={cell.id}
                          className='flex items-center justify-between gap-2 text-xs'
                        >
                          <span className='uppercase tracking-wide text-muted-foreground'>
                            {headerText}
                          </span>
                          <span className='min-w-0 truncate text-right'>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div
        className={cn(
          'hidden overscroll-contain md:block',
          embedded
            ? 'min-h-0 overflow-auto rounded-none border-0'
            : 'overflow-auto rounded-lg border',
          scrollContainerClassName ?? 'max-h-[min(640px,calc(100dvh-14rem))]'
        )}
      >
        <table className='w-full caption-bottom border-separate border-spacing-0 text-sm'>
          <TableHeader>
            {headerGroups.map((hg) => (
              <TableRow key={hg.id} className='hover:bg-transparent'>
                {hg.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      onClick={
                        isSortable ? header.column.getToggleSortingHandler() : undefined
                      }
                      className={cn(
                        'h-11 whitespace-nowrap px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                        isSortable && 'cursor-pointer select-none hover:text-foreground',
                        stickyHeadClass
                      )}
                    >
                      <span className='inline-flex items-center gap-1'>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {isSortable && (
                          <span className='text-muted-foreground'>
                            {dir === 'asc' ? (
                              <ChevronUp className='size-3.5' />
                            ) : dir === 'desc' ? (
                              <ChevronDown className='size-3.5' />
                            ) : (
                              <ArrowUpDown className='size-3.5 opacity-40' />
                            )}
                          </span>
                        )}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className='h-24 px-4 text-center text-sm text-muted-foreground'
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={cn(index % 2 === 1 && 'bg-muted/20')}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='whitespace-nowrap px-4 py-3'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className='flex items-center justify-between px-1 text-xs text-muted-foreground'>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ·{' '}
            {filteredRows.length} rows
          </span>
          <div className='flex gap-1'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Prev
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
