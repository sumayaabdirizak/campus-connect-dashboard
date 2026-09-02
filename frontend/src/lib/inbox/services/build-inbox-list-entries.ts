import type { InboxRow } from '../types';

export type InboxListEntry =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'row'; key: string; row: InboxRow };

export function buildInboxListEntries(rows: InboxRow[]): InboxListEntry[] {
  return rows.map((row) => ({ kind: 'row', key: row.key, row }));
}
