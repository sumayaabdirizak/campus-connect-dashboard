import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';
import type { PlatformRole } from '../types';

export const ROLE_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Role' },
  { id: 'users', label: 'Users' },
  { id: 'type', label: 'Type' }
] as const;

export const ROLE_SORT_OPTS = [
  { id: 'name-asc', label: 'Name A-Z' },
  { id: 'name-desc', label: 'Name Z-A' },
  { id: 'users-desc', label: 'Most users' }
];

export const ROLE_ALL_COLS = ROLE_COLUMN_OPTS.map((c) => c.id);

export function sortRoles(rows: PlatformRole[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') return b.name.localeCompare(a.name);
    if (sortId === 'users-desc') return b.userCount - a.userCount;
    return a.name.localeCompare(b.name);
  });
  return copy;
}

const ROLE_EXPORT_HEADER = ['ID', 'Role', 'Users', 'Type'];

function roleExportRows(rows: PlatformRole[]) {
  return rows.map((r) => [r.id, r.name, r.userCount, r.isBuiltin ? 'Built-in' : 'Custom']);
}

export function exportRolesCsv(rows: PlatformRole[]) {
  downloadCsv('roles.csv', ROLE_EXPORT_HEADER, roleExportRows(rows));
}

export function exportRolesPdf(rows: PlatformRole[]) {
  exportTablePdf('Roles', ROLE_EXPORT_HEADER, roleExportRows(rows));
}
