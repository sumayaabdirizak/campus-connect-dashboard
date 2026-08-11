export type DeanUserRow = {
  id: number;
  full_name: string;
  email: string;
  isAssigned?: boolean;
  batchName?: string;
  sectionName?: string;
  status?: string;
};

/** Faculty user list rows carry assignment fields beyond the base User type. */
export function asDeanUserRows(users: unknown): DeanUserRow[] {
  if (!Array.isArray(users)) return [];
  return users.filter(isDeanUserRow);
}

function isDeanUserRow(value: unknown): value is DeanUserRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'number' &&
    typeof row.full_name === 'string' &&
    typeof row.email === 'string'
  );
}

export function filterUsersBySearch(users: DeanUserRow[], search: string): DeanUserRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return users;
  return users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
}
