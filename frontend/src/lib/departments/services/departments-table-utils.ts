import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';
import type { Department } from '../types';

export const DEPT_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Department' },
  { id: 'code', label: 'Code' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'created', label: 'Created' }
] as const;

export const DEPT_SORT_OPTS = [
  { id: 'name-asc', label: 'Name A-Z' },
  { id: 'name-desc', label: 'Name Z-A' },
  { id: 'faculty-asc', label: 'Faculty A-Z' }
];

export const DEPT_ALL_COLS = DEPT_COLUMN_OPTS.map((c) => c.id);

export function sortDepartments(rows: Department[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') return b.name.localeCompare(a.name);
    if (sortId === 'faculty-asc') {
      return (a.faculty?.name ?? '').localeCompare(b.faculty?.name ?? '');
    }
    return a.name.localeCompare(b.name);
  });
  return copy;
}

const DEPT_EXPORT_HEADER = ['ID', 'Department', 'Code', 'Faculty', 'Created'];

function departmentExportRows(rows: Department[]) {
  return rows.map((d) => [
    d.id,
    d.name,
    d.code,
    d.faculty?.name ?? '',
    d.created_at ? new Date(d.created_at).toLocaleDateString() : ''
  ]);
}

export function exportDepartmentsCsv(rows: Department[]) {
  downloadCsv('departments.csv', DEPT_EXPORT_HEADER, departmentExportRows(rows));
}

export function exportDepartmentsPdf(rows: Department[]) {
  exportTablePdf('Departments', DEPT_EXPORT_HEADER, departmentExportRows(rows));
}
