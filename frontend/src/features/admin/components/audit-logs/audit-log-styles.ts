import type { PlatformAuditLogEntry } from '@/features/admin/api/admin-api';

export function userInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

export const severityStyles: Record<PlatformAuditLogEntry['severity'], string> = {
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  error: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export const actionStyles: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  approve: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  reject: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
};
