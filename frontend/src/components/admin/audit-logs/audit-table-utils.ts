export const AUDIT_ALL_COLS = [
  'timestamp',
  'user',
  'action',
  'module',
  'description',
  'ip',
  'severity',
  'status',
] as const;

export type AuditColumnId = (typeof AUDIT_ALL_COLS)[number];

export const AUDIT_COLUMN_OPTS: { id: AuditColumnId; label: string }[] = [
  { id: 'timestamp', label: 'Timestamp' },
  { id: 'user', label: 'User' },
  { id: 'action', label: 'Action' },
  { id: 'module', label: 'Module' },
  { id: 'description', label: 'Description' },
  { id: 'ip', label: 'IP address' },
  { id: 'severity', label: 'Severity' },
  { id: 'status', label: 'Status' },
];
