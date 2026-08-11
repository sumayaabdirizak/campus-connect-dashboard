export type DeadlineKind = 'announcement' | 'assignment' | 'quiz';

export interface DeadlineRow {
  kind: DeadlineKind;
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: string | null;
}

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
