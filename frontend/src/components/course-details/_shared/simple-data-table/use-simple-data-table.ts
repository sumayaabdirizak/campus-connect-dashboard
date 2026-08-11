import { useMemo, useState } from 'react';
import {
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import type { SimpleDataTableProps } from './types';
import { buildCsvExportHandler } from './csv-export';

export function useSimpleDataTable<TData>({
  data,
  columns,
  initialSorting = [],
  pageSize = 25,
  globalFilter: globalFilterProp,
  onGlobalFilterChange,
  csvFileName
}: Pick<
  SimpleDataTableProps<TData>,
  | 'data'
  | 'columns'
  | 'initialSorting'
  | 'pageSize'
  | 'globalFilter'
  | 'onGlobalFilterChange'
  | 'csvFileName'
>) {
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
  const handleExport = useMemo(
    () => buildCsvExportHandler(csvFileName, filteredRows, table),
    [csvFileName, filteredRows, table]
  );

  return {
    table,
    globalFilter,
    setGlobalFilter,
    filteredRows,
    handleExport,
    visibleRows: table.getRowModel().rows,
    headerGroups: table.getHeaderGroups()
  };
}
