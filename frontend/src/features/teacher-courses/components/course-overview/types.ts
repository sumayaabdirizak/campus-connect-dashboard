import type { CourseTabId } from '@/features/course-details/config/course-tabs';

export interface ScheduleRow {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  topic?: string | null;
}

export interface ToReviewItem {
  id: number;
  type: 'assignment' | 'quiz';
  title: string;
  pendingCount: number;
  status: string;
  dueAt?: string | null;
  openAt?: string | null;
}

export interface OverviewData {
  schedules?: ScheduleRow[];
  toReview?: ToReviewItem[];
  section?: { name: string; _count?: { studentRegistrations: number } };
  quickLinks?: {
    syllabus?: {
      id: number;
      title: string;
      url: string;
      type: string;
    } | null;
    resourcesCount?: number;
  };
  course?: { code: string };
}

export interface CourseOverviewProps {
  data: OverviewData | null;
  isStudent?: boolean;
  onOpenTab?: (tab: CourseTabId) => void;
  courseCode?: string;
  courseId?: string;
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatScheduleTime(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 5);
}
