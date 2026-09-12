import { courseColor } from '@/lib/student-courses/services/course-color';
import type { CalendarItem } from '@/lib/calendar/types';
import { PERSONAL_DEFAULT_COLOR } from '@/lib/calendar/types';
import type { PersonalEvent } from '@/lib/calendar/queries/api';
import type { DeadlineCalendarInput } from '@/components/deadline-calendar-input';

/** Raw deadline shape returned by /announcements/calendar-deadlines. */
export interface DeadlineRow {
  kind: 'announcement' | 'assignment' | 'quiz';
  id: number;
  title: string;
  deadlineAt: string | null;
  deadlineAllDay?: boolean;
  courseCode?: string | null;
  courseOfferingId?: string | null;
}

export function deadlineToItem(d: DeadlineRow): CalendarItem {
  return {
    kind: d.kind,
    id: d.id,
    title: d.title,
    startsAt: d.deadlineAt ?? '',
    endsAt: null,
    allDay: d.deadlineAllDay ?? false,
    courseCode: d.courseCode ?? null,
    courseOfferingId: d.courseOfferingId ?? null
  };
}

export function personalToItem(e: PersonalEvent): CalendarItem {
  return {
    kind: 'personal',
    id: e.id,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    allDay: e.allDay,
    color: e.color,
    notes: e.notes
  };
}

/** Stable per-item seed for the course color (course code, falling back to title). */
export function itemSeed(item: CalendarItem): string {
  return item.courseCode ?? item.title;
}

/** Solid accent color for an item: explicit color wins, else course identity color. */
export function itemColor(item: CalendarItem): string {
  if (item.color) return item.color;
  if (item.kind === 'personal') return PERSONAL_DEFAULT_COLOR;
  return courseColor(itemSeed(item));
}

/** Translucent tint of {@link itemColor} for chip / surface fills. */
export function itemTint(item: CalendarItem, pct = 16): string {
  return `color-mix(in oklab, ${itemColor(item)} ${pct}%, transparent)`;
}

/** Short label: kind + course code + title (so Assignment vs Quiz is clear). */
export function itemLabel(item: CalendarItem): string {
  const kind =
    item.kind === 'quiz'
      ? 'Quiz'
      : item.kind === 'assignment'
        ? 'Assignment'
        : item.kind === 'announcement'
          ? 'Announcement'
          : 'Event';
  const name = item.courseCode ? `${item.courseCode} · ${item.title}` : item.title;
  return `${kind}: ${name}`;
}

export function fmtTime(iso: string | null, allDay?: boolean): string {
  if (!iso) return 'No time';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return allDay
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(d);
}

/** Minutes since local midnight for a timestamp — drives time-grid placement. */
export function minutesSinceMidnight(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Convert a calendar item (deadline) into the shape AddToCalendarButton expects. */
export function calendarItemToDeadlineInput(item: CalendarItem): DeadlineCalendarInput | null {
  if (item.kind === 'personal' || !item.startsAt) return null;
  const due = new Date(item.startsAt);
  if (Number.isNaN(due.getTime())) return null;
  return {
    kind: item.kind,
    id: item.id,
    title: item.title,
    due,
    courseOfferingPublicId: item.courseOfferingId ?? null,
    courseCode: item.courseCode ?? null,
    allDay: item.allDay ?? false
  };
}
