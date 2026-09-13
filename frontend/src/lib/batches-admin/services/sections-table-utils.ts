import { exportTablePdf } from '@/features/pos/components/export-pdf';
import type { BatchSection } from './index';

export const SECTION_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Section' },
  { id: 'batch', label: 'Batch' },
  { id: 'batchId', label: 'Batch ID' }
] as const;

export const SECTION_SORT_OPTS = [
  { id: 'name-asc', label: 'Section A-Z' },
  { id: 'name-desc', label: 'Section Z-A' },
  { id: 'batch-asc', label: 'Batch A-Z' },
  { id: 'batch-desc', label: 'Batch Z-A' }
];

export const SECTION_ALL_COLS = SECTION_COLUMN_OPTS.map((c) => c.id);

export function sortSections(rows: BatchSection[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    const batchA = a.batch?.name ?? '';
    const batchB = b.batch?.name ?? '';
    if (sortId === 'name-desc') return b.name.localeCompare(a.name);
    if (sortId === 'batch-asc') return batchA.localeCompare(batchB) || a.name.localeCompare(b.name);
    if (sortId === 'batch-desc') return batchB.localeCompare(batchA) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
  return copy;
}

const SECTION_EXPORT_HEADER = ['ID', 'Section', 'Batch', 'Batch ID'];

function sectionExportRows(rows: BatchSection[]) {
  return rows.map((s) => [s.id, s.name, s.batch?.name ?? '', s.batchId]);
}

export function exportSectionsCsv(rows: BatchSection[]) {
  const header = SECTION_EXPORT_HEADER;
  const lines = sectionExportRows(rows).map((row) =>
    row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSectionsPdf(rows: BatchSection[]) {
  exportTablePdf('Sections', SECTION_EXPORT_HEADER, sectionExportRows(rows));
}
