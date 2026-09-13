/**
 * Course details query types and interfaces
 */

// Import CourseTabId and CourseTabDef from the canonical config source
export type { CourseTabId, CourseTabDef } from '@/lib/course-details/config/course-tabs';

export interface ReviewQueueItem {
  id: string;
  kind: 'assignment' | 'quiz';
  title: string;
  courseId: string;
  courseName?: string;
  submissionCount?: number;
  totalSubmissions?: number;
  dueAt?: string;
  [key: string]: unknown;
}
