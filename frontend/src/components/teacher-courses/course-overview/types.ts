import type { CourseTabId } from '@/lib/course-details/queries/types';

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
  toReview?: ToReviewItem[];
  section?: {
    name: string;
    _count?: { studentRegistrations: number };
  };
  batch?: { name: string };
  quickLinks?: {
    syllabus?: {
      id: number;
      title: string;
      url: string;
      type: string;
    } | null;
    resourcesCount?: number;
  };
  course?: {
    code: string;
    name?: string;
    description?: string | null;
    credits?: number;
  };
}

export interface CourseOverviewProps {
  data: OverviewData | null;
  isStudent?: boolean;
  onOpenTab?: (tab: CourseTabId) => void;
  courseId?: string;
}

export function formatDueLabel(value: string | null | undefined): string {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
