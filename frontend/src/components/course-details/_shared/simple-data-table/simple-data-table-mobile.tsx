import { flexRender, type Row, type Table } from '@tanstack/react-table';

interface SimpleDataTableMobileProps<TData> {
  table: Table<TData>;
  rows: Row<TData>[];
  mobilePrimaryColumn?: string | false;
  onRowClick?: (row: TData) => void;
}

export function SimpleDataTableMobile<TData>({
  table,
  rows,
  mobilePrimaryColumn,
  onRowClick
}: SimpleDataTableMobileProps<TData>) {
  if (mobilePrimaryColumn === false) return null;

  return (
    <div className='space-y-2 md:hidden'>
      {rows.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground'>
          No results.
        </div>
      ) : (
        rows.map((row) => {
          const leaves = table.getAllLeafColumns().filter((c) => c.getIsVisible());
          const primaryId =
            typeof mobilePrimaryColumn === 'string' ? mobilePrimaryColumn : leaves[0]?.id;
          const primaryCell = row.getVisibleCells().find((c) => c.column.id === primaryId);
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
                  const headerText = typeof header === 'string' ? header : cell.column.id;
                  return (
                    <div key={cell.id} className='flex items-center justify-between gap-2 text-xs'>
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
  );
}
