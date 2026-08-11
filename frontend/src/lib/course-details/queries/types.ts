/**
 * Course details query types and interfaces
 */

export type CourseTabId =
  | 'overview'
  | 'announcements'
  | 'assignments'
  | 'quizzes'
  | 'resources'
  | 'gradebook'
  | 'feed'
  | 'roster'
  | 'groups'
  | 'chat';

export interface CourseTabDef {
  id: CourseTabId;
  label: string;
  icon?: string;
  badge?: number;
  disabled?: boolean;
  visible?: boolean;
}

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
