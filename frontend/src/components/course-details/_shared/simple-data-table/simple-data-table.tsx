'use client';

import { cn } from '@/lib/utils';
import type { SimpleDataTableProps } from './types';

export function SimpleDataTable({
  columns,
  data,
  striped = false,
  hoverable = false,
  bordered = true,
  compact = false,
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
}: SimpleDataTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (empty || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={cn(bordered && 'border rounded-lg overflow-hidden')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-2 text-left font-medium text-gray-700',
                  compact && 'py-1 px-2',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                'border-b',
                striped && idx % 2 === 1 && 'bg-gray-50',
                hoverable && 'hover:bg-gray-50 transition-colors'
              )}
            >
              {columns.map((column) => (
                <td
                  key={`${idx}-${column.key}`}
                  className={cn(
                    'px-4 py-2 text-gray-900',
                    compact && 'py-1 px-2',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
