/**
 * Unified calendar model. Deadlines (derived from announcements / assignments /
 * quizzes) and user-owned personal events are normalised into a single
 * `CalendarItem` shape so every view (month, week, day, agenda) renders one
 * list regardless of source.
 */

export type CalendarKind = 'announcement' | 'assignment' | 'quiz' | 'personal';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarItem {
  kind: CalendarKind;
  /** Unique within a kind; combine with `kind` for a global key. */
  id: number;
  title: string;
  /** ISO timestamp the item starts / is due. */
  startsAt: string;
  /** ISO end timestamp, or null for instantaneous deadlines. */
  endsAt: string | null;
  allDay: boolean;
  courseCode?: string | null;
  courseOfferingId?: string | null;
  /** Explicit accent color (personal events). When absent the UI derives one. */
  color?: string | null;
  notes?: string | null;
}

export const KIND_LABEL: Record<CalendarKind, string> = {
  announcement: 'Announcement',
  assignment: 'Assignment',
  quiz: 'Quiz',
  personal: 'Personal'
};

export const ALL_KINDS: CalendarKind[] = [
  'announcement',
  'assignment',
  'quiz',
  'personal'
];

/** Default accent for a personal event with no explicit color (brand blue). */
export const PERSONAL_DEFAULT_COLOR = '#0468CE';
