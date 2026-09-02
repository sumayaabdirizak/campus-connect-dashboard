import { downloadCsv } from '@/features/pos/components/download-csv';
import { ACTIVE_MS, type RosterRow } from './helpers';

export const ROSTER_SORT_OPTS = [
  { id: 'name-asc', label: 'Student A–Z' },
  { id: 'name-desc', label: 'Student Z–A' },
  { id: 'id-asc', label: 'Student ID A–Z' },
  { id: 'id-desc', label: 'Student ID Z–A' },
  { id: 'last-seen-desc', label: 'Last seen (recent)' },
  { id: 'last-seen-asc', label: 'Last seen (oldest)' }
];

export function sortRosterRows(rows: RosterRow[], sortId: string) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sortId === 'name-desc') return b.full_name.localeCompare(a.full_name);
    if (sortId === 'id-asc') return a.number.localeCompare(b.number);
    if (sortId === 'id-desc') return b.number.localeCompare(a.number);
    if (sortId === 'last-seen-desc' || sortId === 'last-seen-asc') {
      const av = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bv = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return sortId === 'last-seen-desc' ? bv - av : av - bv;
    }
    return a.full_name.localeCompare(b.full_name);
  });
  return copy;
}

function lastSeenLabel(row: RosterRow) {
  if (!row.lastSeenAt) return 'Never';
  const recent = Date.now() - new Date(row.lastSeenAt).getTime() <= ACTIVE_MS;
  const when = new Date(row.lastSeenAt).toLocaleString();
  return recent ? `${when} (Active)` : when;
}

const EXPORT_HEADER = ['Student', 'Student ID', 'Email', 'Last seen'];

function exportRows(rows: RosterRow[]) {
  return rows.map((r) => [r.full_name, r.number, r.email, lastSeenLabel(r)]);
}

export function exportRosterCsv(rows: RosterRow[], courseId: string) {
  downloadCsv(`roster-${courseId}.csv`, EXPORT_HEADER, exportRows(rows));
}
