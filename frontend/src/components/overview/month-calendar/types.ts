export type DeadlineKind = 'announcement' | 'assignment' | 'quiz' | 'personal';

export interface DeadlineRow {
  kind: DeadlineKind;
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: string | null;
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
