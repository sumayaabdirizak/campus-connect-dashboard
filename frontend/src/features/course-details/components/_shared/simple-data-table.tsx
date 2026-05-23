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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ArrowUpDown, ChevronDown, ChevronUp, Download, Search } from 'lucide-react';

interface SimpleDataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  /// Hint for the search box ("Search students…"). Search is global across
  /// every leaf field — works without per-column filter config.
  searchPlaceholder?: string;
  /// When set, a Download icon button exports the CURRENT FILTERED ROWS as
  /// CSV. Provide a stable file name (no extension).
  csvFileName?: string;
  /// Initial sort spec, e.g. `[{ id: 'full_name', desc: false }]`.
  initialSorting?: SortingState;
  /// Items per page. Defaults to 25 — fits a typical class roster on screen.
  pageSize?: number;
  /// Click handler for an entire row (e.g. open a profile drawer).
  onRowClick?: (row: TData) => void;
  /// Optional extra UI rendered next to the search box.
  toolbarRight?: React.ReactNode;
  /// Column id used as the bold title in the mobile card view. Defaults to
  /// the first leaf column. Pass `false` to disable the responsive cards
  /// (falls back to a horizontal-scroll table on every breakpoint).
  mobilePrimaryColumn?: string | false;
}

/**
 * In-memory data table for the course-details tabs.
 *
 * Sort, global filter, pagination, and CSV export — all client-side. No URL
 * sync, no faceted filters, no manual pagination. Use this when the data set
 * is small enough to live in React state (rosters, sessions, submissions,
 * attempts) and you want a consistent look without wiring 50 lines of
 * `useReactTable` boilerplate per tab.
 *
 * For larger paginated data sets, use the dashboard's `useDataTable` + the
 * full `<DataTable>` from `components/ui/table/data-table.tsx` instead.
 */
export function SimpleDataTable<TData>({
  data,
  columns,
  searchPlaceholder = 'Search…',
  csvFileName,
  initialSorting = [],
  pageSize = 25,
  onRowClick,
  toolbarRight,
  mobilePrimaryColumn
}: SimpleDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState('');

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

  // Build a flat CSV from the leaf columns + the rendered cell values. We
  // serialise primitives directly; everything else (JSX cells, dates) is
  // coerced via String() so the export at least lines up — callers wanting
  // richer CSV output should override per-column.
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
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
          return String(v);
        })
      );
      const escape = (val: unknown) => `"${String(val).replace(/"/g, '""')}"`;
      const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${csvFileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
  }, [csvFileName, filteredRows, table]);

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='relative flex-1 min-w-[180px] max-w-xs'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className='pl-10'
          />
        </div>
        {toolbarRight}
        {handleExport && (
          <Button variant='outline' size='sm' className='gap-1 ml-auto' onClick={handleExport}>
            <Download className='w-4 h-4' /> Export CSV
          </Button>
        )}
      </div>

      {/* Mobile: each row becomes a card with primary column as the title and
          every other column as label/value pairs underneath. Tap to fire
          onRowClick. */}
      {mobilePrimaryColumn !== false && (
        <div className='md:hidden space-y-2'>
          {visibleRows.length === 0 ? (
            <div className='border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground'>
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
              const rest = row
                .getVisibleCells()
                .filter((c) => c.column.id !== primaryId);
              return (
                <button
                  key={row.id}
                  type='button'
                  onClick={() => onRowClick?.(row.original)}
                  className='w-full text-left rounded-lg border p-3 space-y-1 active:bg-muted/40'
                >
                  {primaryCell && (
                    <div className='text-sm font-medium'>
                      {flexRender(
                        primaryCell.column.columnDef.cell,
                        primaryCell.getContext()
                      )}
                    </div>
                  )}
                  {rest.map((cell) => {
                    const header = cell.column.columnDef.header;
                    const headerText =
                      typeof header === 'string' ? header : cell.column.id;
                    return (
                      <div
                        key={cell.id}
                        className='flex items-center justify-between gap-2 text-xs'
                      >
                        <span className='text-muted-foreground uppercase tracking-wide'>
                          {headerText}
                        </span>
                        <span className='text-right min-w-0 truncate'>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </div>
                    );
                  })}
                </button>
              );
            })
          )}
        </div>
      )}

      <div
        className={
          mobilePrimaryColumn === false
            ? 'rounded-lg border overflow-hidden'
            : 'rounded-lg border overflow-hidden hidden md:block'
        }
      >
        <Table>
          <TableHeader className='bg-muted/30'>
            {headerGroups.map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      onClick={
                        isSortable ? header.column.getToggleSortingHandler() : undefined
                      }
                      className={isSortable ? 'cursor-pointer select-none' : undefined}
                    >
                      <span className='inline-flex items-center gap-1'>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {isSortable && (
                          <span className='text-muted-foreground'>
                            {dir === 'asc' ? (
                              <ChevronUp className='w-3 h-3' />
                            ) : dir === 'desc' ? (
                              <ChevronDown className='w-3 h-3' />
                            ) : (
                              <ArrowUpDown className='w-3 h-3 opacity-40' />
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
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className='h-24 text-center text-sm text-muted-foreground'
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/30' : undefined}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className='flex items-center justify-between text-xs text-muted-foreground'>
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
