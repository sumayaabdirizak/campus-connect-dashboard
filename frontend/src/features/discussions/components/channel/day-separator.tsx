'use client';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function DaySeparator({ iso }: { iso: string }) {
  return (
    <div
      role='separator'
      aria-label={formatDayLabel(iso)}
      className='relative my-2 flex items-center'
    >
      <div className='flex-1 border-t border-border' />
      <span className='mx-3 rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground'>
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
