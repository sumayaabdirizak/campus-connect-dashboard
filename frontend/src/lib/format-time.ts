import { serverNow, serverNowDate } from '@/lib/server-clock';

export function serverNowIso(): string {
  return new Date(serverNow()).toISOString();
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** True when an ISO timestamp is before the synced server now. */
export function isPastIso(iso: string): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t < serverNow();
}

/** Spelled-out relative time: "about 1 month ago". */
export function timeAgoLong(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const mins = Math.floor((serverNow() - then) / 60000);
  if (mins < 1) return 'just now';
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (mins < 60) return plural(mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return plural(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 30) return plural(days, 'day');
  const months = Math.floor(days / 30);
  if (months < 12) return `about ${plural(months, 'month')}`;
  return `about ${plural(Math.floor(months / 12), 'year')}`;
}

/** "just now" / "5m ago" / short date — uses server clock for comparisons. */
export function relativeTime(iso: string): string {
  const ms = serverNow() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Clock time for a message bubble (local timezone). */
export function formatMessageClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Search / list rows: time if today (server day), else short date. */
export function formatMessageWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = serverNowDate();
    if (isSameCalendarDay(d, now)) {
      return formatMessageClock(iso);
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** "Today" / "Yesterday" / short date for day dividers. */
export function formatMessageDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = serverNowDate();
  const yesterday = serverNowDate();
  yesterday.setDate(today.getDate() - 1);
  if (isSameCalendarDay(d, today)) return 'Today';
  if (isSameCalendarDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
  });
}

/** Office / thread style timestamp. */
export function formatMessageDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
