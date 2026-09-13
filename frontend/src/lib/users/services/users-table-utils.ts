import type { User } from '../types';
import { downloadCsv } from '@/features/pos/components/download-csv';
import { exportTablePdf } from '@/features/pos/components/export-pdf';

export const USER_ALL_COLS = ['id', 'name', 'number', 'role', 'status'] as const;

export const USER_COLUMN_OPTS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name' },
  { id: 'number', label: 'University ID' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' }
] as const;

export const USER_SORT_OPTS = [
  { id: 'name-asc', label: 'Name A–Z' },
  { id: 'name-desc', label: 'Name Z–A' },
  { id: 'role-asc', label: 'Role A–Z' },
  { id: 'newest', label: 'Newest' }
] as const;

export type UserRoleTab = 'ALL' | 'STUDENT' | 'TEACHER' | 'DEAN' | 'STAFF';

export function sortUsers(users: User[], sortId: string): User[] {
  const rows = [...users];
  switch (sortId) {
    case 'name-desc':
      return rows.sort((a, b) => b.full_name.localeCompare(a.full_name));
    case 'role-asc':
      return rows.sort((a, b) => a.role.localeCompare(b.role));
    case 'newest':
      return rows.sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return tb - ta;
      });
    case 'name-asc':
    default:
      return rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }
}

const USER_EXPORT_HEADER = ['ID', 'Name', 'Email', 'University ID', 'Phone', 'Role', 'Status'];

function userExportRows(users: User[]) {
  return users.map((u) => [
    u.id,
    u.full_name,
    u.email,
    u.number ?? '',
    u.phone ?? '',
    u.role,
    u.status ?? ''
  ]);
}

export function exportUsersCsv(users: User[]) {
  downloadCsv('users.csv', USER_EXPORT_HEADER, userExportRows(users));
}

export function exportUsersPdf(users: User[]) {
  exportTablePdf('Users', USER_EXPORT_HEADER, userExportRows(users));
}

export function roleTabToApi(tab: UserRoleTab): string | undefined {
  if (tab === 'ALL') return undefined;
  return tab;
}
