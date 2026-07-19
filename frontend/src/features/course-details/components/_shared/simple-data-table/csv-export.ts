import type { Row, Table } from '@tanstack/react-table';

export function buildCsvExportHandler<TData>(
  csvFileName: string | undefined,
  filteredRows: Row<TData>[],
  table: Table<TData>
): (() => void) | null {
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
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          return v;
        }
        return String(v);
      })
    );
    const escape = (val: unknown) => `"${String(val).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${csvFileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
