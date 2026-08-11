/**
 * Calendar type definitions and utilities
 */

export interface DeadlineRow {
  id: string;
  kind: 'assignment' | 'quiz' | 'announcement' | 'event';
  title?: string;
  description?: string;
  deadlineAt?: string;
  courseId?: string;
  courseName?: string;
  offeredByInstructor?: string;
  submissionCount?: number;
  [key: string]: unknown;
}
