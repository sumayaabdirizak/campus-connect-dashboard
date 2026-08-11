import type { InboxRow } from '../types';

export type InboxListEntry =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'row'; key: string; row: InboxRow };

function isFacultyDesk(row: InboxRow): boolean {
  if (row.type !== 'office' || row.officeKind !== 'desk') return false;
  if (row.facultyId != null && Number(row.facultyId) > 0) return true;
  if (row.facultyName) return true;
  return Boolean(row.subtitle?.startsWith('Faculty'));
}

function isUniversityDesk(row: InboxRow): boolean {
  return row.type === 'office' && row.officeKind === 'desk' && !isFacultyDesk(row);
}

function byTitle(a: InboxRow, b: InboxRow) {
  return String(a.title).localeCompare(String(b.title));
}

function byFacultyThenTitle(a: InboxRow, b: InboxRow) {
  const fa = String(a.facultyName ?? a.subtitle ?? '');
  const fb = String(b.facultyName ?? b.subtitle ?? '');
  const c = fa.localeCompare(fb);
  return c !== 0 ? c : byTitle(a, b);
}

function byTimestampDesc(a: InboxRow, b: InboxRow) {
  const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
  const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
  return bt - at;
}

/**
 * AO Messages: University desks → Faculty desks → other rows (DMs).
 * Other roles: keep API order (flat).
 */
export function buildInboxListEntries(
  rows: InboxRow[],
  opts: { groupOfficeDesks: boolean }
): InboxListEntry[] {
  if (!opts.groupOfficeDesks) {
    return rows.map((row) => ({ kind: 'row', key: row.key, row }));
  }

  const university = rows.filter(isUniversityDesk).sort(byTitle);
  const faculty = rows.filter(isFacultyDesk).sort(byFacultyThenTitle);
  const rest = rows
    .filter((r) => !isUniversityDesk(r) && !isFacultyDesk(r))
    .sort(byTimestampDesc);

  const out: InboxListEntry[] = [];
  if (university.length > 0) {
    out.push({ kind: 'header', key: 'hdr-university', label: 'University' });
    for (const row of university) out.push({ kind: 'row', key: row.key, row });
  }
  if (faculty.length > 0) {
    out.push({ kind: 'header', key: 'hdr-faculty', label: 'Faculties' });
    for (const row of faculty) out.push({ kind: 'row', key: row.key, row });
  }
  if (rest.length > 0) {
    if (university.length > 0 || faculty.length > 0) {
      out.push({ kind: 'header', key: 'hdr-other', label: 'Direct messages' });
    }
    for (const row of rest) out.push({ kind: 'row', key: row.key, row });
  }
  return out;
}
