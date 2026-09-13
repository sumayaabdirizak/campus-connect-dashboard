import { formatMessageClock, formatMessageDayLabel } from '@/lib/format-time';

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  );
}

export function messageTime(value: string): string {
  return formatMessageClock(value);
}

/** "Today" / "Yesterday" / a short date for the day-divider pills. */
export function dayLabel(value: string): string {
  return formatMessageDayLabel(value);
}
