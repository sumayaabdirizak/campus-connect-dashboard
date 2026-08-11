/**
 * Simple data table types
 */

export interface SimpleDataTableProps {
  columns: Array<any>;
  data: Array<any>;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  hideToolbar?: boolean;
  embedded?: boolean;
  scrollContainerClassName?: string;
  mobilePrimaryColumn?: string;
}
