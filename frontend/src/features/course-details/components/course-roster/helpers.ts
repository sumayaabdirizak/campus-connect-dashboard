import type { RosterStudent } from '../../api/roster-types';

export const ACTIVE_MS = 7 * 24 * 60 * 60 * 1000;

export interface RosterRow extends RosterStudent {
  lastSeenAt: string | null;
}

export function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function computeRosterStats(rows: RosterRow[]) {
  const now = Date.now();
  let active = 0;
  let never = 0;
  for (const row of rows) {
    if (!row.lastSeenAt) {
      never += 1;
      continue;
    }
    if (now - new Date(row.lastSeenAt).getTime() <= ACTIVE_MS) {
      active += 1;
    }
  }
  return { total: rows.length, active, never };
}
