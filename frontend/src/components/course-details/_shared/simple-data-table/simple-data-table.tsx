'use client';

import { cn } from '@/lib/utils';
import type { SimpleDataTableProps } from './types';
import { useSimpleDataTable } from './use-simple-data-table';
import { SimpleDataTableToolbar } from './simple-data-table-toolbar';
import { SimpleDataTableMobile } from './simple-data-table-mobile';
import { SimpleDataTableDesktop } from './simple-data-table-desktop';
import { SimpleDataTablePagination } from './simple-data-table-pagination';

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
  const {
    table,
    globalFilter,
    setGlobalFilter,
    filteredRows,
    handleExport,
    visibleRows,
    headerGroups
  } = useSimpleDataTable({
    data,
    columns,
    initialSorting,
    pageSize,
    globalFilter: globalFilterProp,
    onGlobalFilterChange,
    csvFileName
  });

  return (
    <div className={cn(!embedded && 'space-y-3')}>
      {!hideToolbar && (
        <SimpleDataTableToolbar
          searchPlaceholder={searchPlaceholder}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          toolbarRight={toolbarRight}
          onExport={handleExport}
        />
      )}
      <SimpleDataTableMobile
        table={table}
        rows={visibleRows}
        mobilePrimaryColumn={mobilePrimaryColumn}
        onRowClick={onRowClick}
      />
      <SimpleDataTableDesktop
        table={table}
        headerGroups={headerGroups}
        rows={visibleRows}
        stickyHeader={stickyHeader}
        embedded={embedded}
        scrollContainerClassName={scrollContainerClassName}
        onRowClick={onRowClick}
      />
      <SimpleDataTablePagination table={table} filteredRowCount={filteredRows.length} />
    </div>
  );
}
