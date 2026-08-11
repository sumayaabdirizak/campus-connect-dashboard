import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';
import type { SupportOffice } from '../types';

export const OFFICE_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Office' },
  { id: 'slug', label: 'Slug' },
  { id: 'prefix', label: 'Prefix' },
  { id: 'status', label: 'Status' },
  { id: 'description', label: 'Description' },
  { id: 'created', label: 'Created' }
] as const;

export const OFFICE_SORT_OPTS = [
  { id: 'name-asc', label: 'Name A-Z' },
  { id: 'name-desc', label: 'Name Z-A' },
  { id: 'slug-asc', label: 'Slug A-Z' },
  { id: 'created-desc', label: 'Newest first' }
];

export const OFFICE_ALL_COLS = OFFICE_COLUMN_OPTS.map((c) => c.id);

export function sortOffices(rows: SupportOffice[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') return b.name.localeCompare(a.name);
    if (sortId === 'slug-asc') return a.slug.localeCompare(b.slug);
    if (sortId === 'created-desc') {
      return String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));
    }
    return a.name.localeCompare(b.name);
  });
  return copy;
}

const OFFICE_EXPORT_HEADER = ['ID', 'Office', 'Slug', 'Prefix', 'Status', 'Description', 'Created'];

function officeExportRows(rows: SupportOffice[]) {
  return rows.map((o) => [
    o.id,
    o.name,
    o.slug,
    o.codePrefix,
    o.isActive === false ? 'Inactive' : 'Active',
    o.description ?? '',
    o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''
  ]);
}

export function exportOfficesCsv(rows: SupportOffice[]) {
  downloadCsv('offices.csv', OFFICE_EXPORT_HEADER, officeExportRows(rows));
}

export function exportOfficesPdf(rows: SupportOffice[]) {
  exportTablePdf('Offices', OFFICE_EXPORT_HEADER, officeExportRows(rows));
}
