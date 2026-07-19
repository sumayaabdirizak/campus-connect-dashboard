'use client';

import { cn } from '@/lib/utils';
import type { OfficeThreadStatus } from '../api/office-types';

export const STATUS_LABEL: Record<OfficeThreadStatus, string> = {
  OPEN: 'Open',
  AWAITING_STUDENT: 'Replied',
  RESOLVED: 'Resolved'
};

const STATUS_CLASSES: Record<OfficeThreadStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  AWAITING_STUDENT: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
};

export function StatusChip({ status }: { status: OfficeThreadStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        STATUS_CLASSES[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
