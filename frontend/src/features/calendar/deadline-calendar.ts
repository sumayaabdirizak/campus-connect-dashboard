import type { DeadlineRow } from './lib';
import type { CalendarItem } from './types';

export type DeadlineKind = DeadlineRow['kind'];

export const DEADLINE_ADDED_KEY_PREFIX = 'cc-cal-deadline:';
const LEGACY_ASSIGNMENT_PREFIX = 'cc-cal-assignment:';

export type DeadlineCalendarInput = {
  kind: DeadlineKind;
  id: number | string;
  title: string;
  due: Date;
  description?: string | null;
  courseOfferingPublicId?: string | null;
  courseCode?: string | null;
  allDay?: boolean;
};

export function deadlineStorageKey(kind: DeadlineKind, id: number | string): string {
  return `${DEADLINE_ADDED_KEY_PREFIX}${kind}:${String(id)}`;
}

export function deadlineMarkerInNotes(kind: DeadlineKind, id: number | string): string {
  return deadlineStorageKey(kind, id);
}

export function wasDeadlineAddedLocally(kind: DeadlineKind, id: number | string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(deadlineStorageKey(kind, id)) === '1') return true;
    if (kind === 'assignment' && localStorage.getItem(`${LEGACY_ASSIGNMENT_PREFIX}${id}`) === '1') {
      return true;
    }
  } catch {
    // Private browsing / quota — ignore.
  }
  return false;
}

export function markDeadlineAddedLocally(kind: DeadlineKind, id: number | string): void {
  try {
    localStorage.setItem(deadlineStorageKey(kind, id), '1');
  } catch {
    // Private browsing / quota — ignore.
  }
}

export function deadlineTitleForCalendar(input: DeadlineCalendarInput): string {
  switch (input.kind) {
    case 'quiz':
      return `Quiz due: ${input.title}`;
    case 'announcement':
      return `Deadline: ${input.title}`;
    default:
      return `Due: ${input.title}`;
  }
}

export function buildDeadlineCalendarNotes(input: DeadlineCalendarInput): string {
  const lines: string[] = [];
  if (input.description?.trim()) lines.push(input.description.trim());

  if (input.kind === 'announcement') {
    lines.push('/dashboard/announcements');
  } else if (input.courseOfferingPublicId) {
    const tab = input.kind === 'quiz' ? 'quizzes' : 'assignments';
    lines.push(`/dashboard/courses/${input.courseOfferingPublicId}?tab=${tab}`);
  }

  lines.push(deadlineMarkerInNotes(input.kind, input.id));
  return lines.join('\n\n');
}

export function deadlineRowToCalendarInput(row: DeadlineRow): DeadlineCalendarInput | null {
  if (!row.deadlineAt) return null;
  const due = new Date(row.deadlineAt);
  if (Number.isNaN(due.getTime())) return null;
  return {
    kind: row.kind,
    id: row.id,
    title: row.title,
    due,
    courseOfferingPublicId: row.courseOfferingId ?? null,
    courseCode: row.courseCode ?? null,
    allDay: row.deadlineAllDay ?? false,
  };
}

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
    allDay: item.allDay ?? false,
  };
}

/** Upcoming deadlines for dashboard timeline widgets. */
export function filterUpcomingDeadlines<T extends DeadlineRow>(
  results: T[] | undefined,
  kinds: readonly DeadlineKind[] = ['assignment', 'quiz', 'announcement']
): T[] {
  const now = Date.now();
  return (results ?? [])
    .filter(
      (d) =>
        kinds.includes(d.kind) &&
        d.deadlineAt &&
        new Date(d.deadlineAt).getTime() >= now
    )
    .sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime());
}
