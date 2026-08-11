import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';

export type FacultyRow = {
  id: number;
  name: string;
  code: string;
  defaultDurationYears?: number;
  description?: string;
  established?: string;
  status?: 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  departments?: { id: number }[];
};

export const FACULTY_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Faculty' },
  { id: 'code', label: 'Code' },
  { id: 'duration', label: 'Duration' },
  { id: 'departments', label: 'Departments' },
  { id: 'created', label: 'Created' }
] as const;

export const FACULTY_SORT_OPTS = [
  { id: 'name-asc', label: 'Name A-Z' },
  { id: 'name-desc', label: 'Name Z-A' },
  { id: 'code-asc', label: 'Code A-Z' }
];

export const FACULTY_ALL_COLS = FACULTY_COLUMN_OPTS.map((c) => c.id);

export function sortFaculties(rows: FacultyRow[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') return b.name.localeCompare(a.name);
    if (sortId === 'code-asc') return a.code.localeCompare(b.code);
    return a.name.localeCompare(b.name);
  });
  return copy;
}

const FACULTY_EXPORT_HEADER = ['ID', 'Faculty', 'Code', 'Duration', 'Departments', 'Created'];

function facultyExportRows(rows: FacultyRow[]) {
  return rows.map((f) => [
    f.id,
    f.name,
    f.code,
    f.defaultDurationYears ?? 4,
    f.departments?.length ?? 0,
    f.created_at ? new Date(f.created_at).toLocaleDateString() : ''
  ]);
}

export function exportFacultiesCsv(rows: FacultyRow[]) {
  downloadCsv('faculties.csv', FACULTY_EXPORT_HEADER, facultyExportRows(rows));
}

export function exportFacultiesPdf(rows: FacultyRow[]) {
  exportTablePdf('Faculties', FACULTY_EXPORT_HEADER, facultyExportRows(rows));
}
