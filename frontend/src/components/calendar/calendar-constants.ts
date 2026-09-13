import type { CalendarView } from '@/lib/calendar/types';

export function isAllDayUtc(iso: string): boolean {
  const d = new Date(iso);
  return (
    !Number.isNaN(d.getTime()) &&
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0
  );
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const VIEWS: [CalendarView, string][] = [
  ['month', 'Month'],
  ['week', 'Week'],
  ['day', 'Day'],
  ['agenda', 'Agenda']
];
