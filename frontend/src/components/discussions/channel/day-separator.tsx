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
      className='relative my-3 flex items-center px-3 sm:px-4'
    >
      <div className='flex-1 border-t border-[#E5E7EB]' />
      <span className='mx-3 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[11px] font-medium text-[#667085]'>
        {formatDayLabel(iso)}
      </span>
      <div className='flex-1 border-t border-[#E5E7EB]' />
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
