import { exportTablePdf } from '@/features/pos/components/export-pdf';
import type { AdminBatch } from './index';

export const BATCH_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Batch Name' },
  { id: 'program', label: 'Program' },
  { id: 'intake', label: 'Intake' },
  { id: 'semester', label: 'Semester' },
  { id: 'status', label: 'Status' }
] as const;

export const BATCH_SORT_OPTS = [
  { id: 'name-asc', label: 'Batch Name A-Z' },
  { id: 'name-desc', label: 'Batch Name Z-A' },
  { id: 'intake-desc', label: 'Intake newest' },
  { id: 'intake-asc', label: 'Intake oldest' }
];

export const BATCH_ALL_COLS = BATCH_COLUMN_OPTS.map((c) => c.id);

export function sortBatches(rows: AdminBatch[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') return b.name.localeCompare(a.name);
    if (sortId === 'intake-asc') {
      return (a.academicYear?.name ?? '').localeCompare(b.academicYear?.name ?? '');
    }
    if (sortId === 'intake-desc') {
      return (b.academicYear?.name ?? '').localeCompare(a.academicYear?.name ?? '');
    }
    return a.name.localeCompare(b.name);
  });
  return copy;
}

const BATCH_EXPORT_HEADER = ['ID', 'Batch Name', 'Program', 'Intake', 'Semester', 'Status'];

function batchExportRows(rows: AdminBatch[]) {
  return rows.map((b) => {
    const inactive = b.isGraduated || b.status === 'INACTIVE';
    const sem = `${b.cohortSemester ?? b.semester_number}${
      b.maxSemesters ? ` / ${b.maxSemesters}` : ''
    }`;
    return [
      b.id,
      b.name,
      b.program?.code ?? '',
      b.academicYear?.name ?? '',
      sem,
      inactive ? 'Inactive' : 'Active'
    ];
  });
}

export function exportBatchesCsv(rows: AdminBatch[]) {
  const header = BATCH_EXPORT_HEADER;
  const lines = batchExportRows(rows).map((row) =>
    row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'batches.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBatchesPdf(rows: AdminBatch[]) {
  exportTablePdf('Batches', BATCH_EXPORT_HEADER, batchExportRows(rows));
}
