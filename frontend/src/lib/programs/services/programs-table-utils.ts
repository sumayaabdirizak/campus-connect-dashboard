import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';
import type { Program } from './index';

export const PROGRAM_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Program Name' },
  { id: 'code', label: 'Code' },
  { id: 'level', label: 'Level' },
  { id: 'duration', label: 'Duration' },
  { id: 'department', label: 'Department' },
  { id: 'created', label: 'Created' }
] as const;

export const PROGRAM_SORT_OPTS = [
  { id: 'name-asc', label: 'Name A-Z' },
  { id: 'name-desc', label: 'Name Z-A' },
  { id: 'code-asc', label: 'Code A-Z' }
];

export const PROGRAM_ALL_COLS = PROGRAM_COLUMN_OPTS.map((c) => c.id);

export function sortPrograms(rows: Program[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') return b.name.localeCompare(a.name);
    if (sortId === 'code-asc') return a.code.localeCompare(b.code);
    return a.name.localeCompare(b.name);
  });
  return copy;
}

const PROGRAM_EXPORT_HEADER = ['ID', 'Program', 'Code', 'Level', 'Duration', 'Department', 'Created'];

function programExportRows(rows: Program[]) {
  return rows.map((p) => [
    p.id,
    p.name,
    p.code,
    p.level,
    `${p.durationYears ?? 4}y / ${(p.durationYears ?? 4) * 2}sem`,
    p.department?.name ?? '',
    p.created_at ? new Date(p.created_at).toLocaleDateString() : ''
  ]);
}

export function exportProgramsCsv(rows: Program[]) {
  downloadCsv('programs.csv', PROGRAM_EXPORT_HEADER, programExportRows(rows));
}

export function exportProgramsPdf(rows: Program[]) {
  exportTablePdf('Programs', PROGRAM_EXPORT_HEADER, programExportRows(rows));
}
