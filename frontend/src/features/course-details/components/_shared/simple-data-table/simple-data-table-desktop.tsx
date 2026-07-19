import { flexRender, type HeaderGroup, type Row, type Table } from '@tanstack/react-table';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleDataTableDesktopProps<TData> {
  table: Table<TData>;
  headerGroups: HeaderGroup<TData>[];
  rows: Row<TData>[];
  stickyHeader: boolean;
  embedded: boolean;
  scrollContainerClassName?: string;
  onRowClick?: (row: TData) => void;
}

export function SimpleDataTableDesktop<TData>({
  table,
  headerGroups,
  rows,
  stickyHeader,
  embedded,
  scrollContainerClassName,
  onRowClick
}: SimpleDataTableDesktopProps<TData>) {
  const stickyHeadClass = stickyHeader
    ? 'sticky top-0 z-30 bg-card shadow-[inset_0_-1px_0_0_hsl(var(--border))]'
    : undefined;

  return (
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
                    onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
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
          {rows.length === 0 ? (
            <TableRow className='hover:bg-transparent'>
              <TableCell
                colSpan={table.getAllColumns().length}
                className='h-24 px-4 text-center text-sm text-muted-foreground'
              >
                No results.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
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
  );
}
