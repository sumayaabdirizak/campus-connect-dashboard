/**
 * Simple data table types
 */

export interface SimpleDataTableProps {
  columns: Array<{
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
    render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  }>;
  data: Record<string, unknown>[];
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}
