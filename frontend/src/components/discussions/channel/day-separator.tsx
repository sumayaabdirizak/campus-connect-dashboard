'use client';

import { formatMessageDayLabel } from '@/lib/format-time';

function formatDayLabel(iso: string): string {
  return formatMessageDayLabel(iso);
}

export function DaySeparator({ iso }: { iso: string }) {
  return (
    <div
      role='separator'
      aria-label={formatDayLabel(iso)}
      className='relative my-3 flex items-center px-3 sm:px-4'
    >
      <div className='flex-1 border-t border-border' />
      <span className='mx-3 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground'>
        {formatDayLabel(iso)}
      </span>
      <div className='flex-1 border-t border-border' />
    </div>
  );
}

export function isSameLocalDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
