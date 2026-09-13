import { Button } from '@/features/ui/components/button';
import type { Table } from '@tanstack/react-table';

interface SimpleDataTablePaginationProps<TData> {
  table: Table<TData>;
  filteredRowCount: number;
}

export function SimpleDataTablePagination<TData>({
  table,
  filteredRowCount
}: SimpleDataTablePaginationProps<TData>) {
  if (table.getPageCount() <= 1) return null;

  return (
    <div className='flex items-center justify-between px-1 text-xs text-muted-foreground'>
      <span>
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ·{' '}
        {filteredRowCount} rows
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
  );
}
