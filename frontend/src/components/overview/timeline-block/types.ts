'use client';

import { FileText, ClipboardCheck, Megaphone } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

export type DeadlineKind = 'announcement' | 'assignment' | 'quiz' | 'event';

export interface TimelineItem {
  kind: DeadlineKind;
  id: number | string;
  title?: string;
  deadlineAt?: string | null;
  courseCode?: string | null;
  courseOfferingId?: string | null;
}

export const TIMELINE_ICON: Record<DeadlineKind, typeof FileText> = {
  assignment: FileText,
  quiz: ClipboardCheck,
  announcement: Megaphone,
  event: FileText
};

export const ACTION_BY_AUDIENCE: Record<'student' | 'teacher', Record<DeadlineKind, string>> = {
  student: { assignment: 'Add submission', quiz: 'Attempt quiz', announcement: 'View', event: 'View' },
  teacher: { assignment: 'View submissions', quiz: 'View results', announcement: 'View', event: 'View' }
};

export function timelineHrefFor(d: TimelineItem): string {
  if (d.kind === 'announcement' || d.kind === 'event') return '/dashboard/calendar';
  const tab = d.kind === 'quiz' ? 'quizzes' : 'assignments';
  return d.courseOfferingId ? `/dashboard/courses/${d.courseOfferingId}?tab=${tab}` : '/dashboard/calendar';
}

export function timelineDayHeading(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEEE, d MMMM');
}

export interface TimelineGroup {
  heading: string;
  items: TimelineItem[];
}
