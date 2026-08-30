import type { ColumnDef, SortingState } from '@tanstack/react-table';

export interface SimpleDataTableProps<TData> {
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
  /** Keep export in table toolbar but move search to the page header. */
  hideToolbarSearch?: boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  /** Sticky column headers while the table body scrolls. Default true. */
  stickyHeader?: boolean;
  /** Classes for the scrollable table region. */
  scrollContainerClassName?: string;
  /** Tighter layout when nested inside CoursePageShell. */
  embedded?: boolean;
}
