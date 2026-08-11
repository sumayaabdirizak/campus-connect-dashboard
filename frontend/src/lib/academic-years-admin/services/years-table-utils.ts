import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';
import type { AdminAcademicYear, AdminSemesterRow } from './index';
import { formatDisplayDate } from './format-dates';

export const YEAR_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Academic Year' },
  { id: 'dates', label: 'Dates' },
  { id: 'semesters', label: 'Semesters' },
  { id: 'batches', label: 'Batches' },
  { id: 'status', label: 'Status' }
] as const;

export const YEAR_SORT_OPTS = [
  { id: 'name-desc', label: 'Newest first' },
  { id: 'name-asc', label: 'Oldest first' }
];

export const YEAR_ALL_COLS = YEAR_COLUMN_OPTS.map((c) => c.id);

export function sortYears(rows: AdminAcademicYear[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) =>
    sortId === 'name-asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );
  return copy;
}

const YEAR_EXPORT_HEADER = ['ID', 'Name', 'Start', 'End', 'Semesters', 'Batches', 'Status'];

function yearExportRows(rows: AdminAcademicYear[]) {
  return rows.map((y) => [
    y.id,
    y.name,
    formatDisplayDate(y.start_date),
    formatDisplayDate(y.end_date),
    y.semesters?.length ?? 0,
    y.batches?.length ?? 0,
    y.inActiveWindow ? 'Active window' : 'History'
  ]);
}

export function exportYearsCsv(rows: AdminAcademicYear[]) {
  downloadCsv('academic-years.csv', YEAR_EXPORT_HEADER, yearExportRows(rows));
}

export function exportYearsPdf(rows: AdminAcademicYear[]) {
  exportTablePdf('Academic Years', YEAR_EXPORT_HEADER, yearExportRows(rows));
}

export const SEM_COLUMN_OPTS = [
  { id: 'sequence', label: '#' },
  { id: 'name', label: 'Name' },
  { id: 'year', label: 'Academic year' },
  { id: 'dates', label: 'Dates' }
] as const;

export const SEM_SORT_OPTS = [
  { id: 'seq-asc', label: '# ascending' },
  { id: 'seq-desc', label: '# descending' }
];

export const SEM_ALL_COLS = SEM_COLUMN_OPTS.map((c) => c.id);

export function sortSemesters(rows: AdminSemesterRow[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) =>
    sortId === 'seq-desc' ? b.sequence - a.sequence : a.sequence - b.sequence
  );
  return copy;
}

const SEM_EXPORT_HEADER = ['#', 'Name', 'Academic year', 'Start', 'End'];

function semesterExportRows(rows: AdminSemesterRow[]) {
  return rows.map((s) => [
    s.sequence,
    s.name,
    s.academicYear?.name ?? '',
    formatDisplayDate(s.start_date),
    formatDisplayDate(s.end_date)
  ]);
}

export function exportSemestersCsv(rows: AdminSemesterRow[]) {
  downloadCsv('semesters.csv', SEM_EXPORT_HEADER, semesterExportRows(rows));
}

export function exportSemestersPdf(rows: AdminSemesterRow[]) {
  exportTablePdf('Semesters', SEM_EXPORT_HEADER, semesterExportRows(rows));
}
