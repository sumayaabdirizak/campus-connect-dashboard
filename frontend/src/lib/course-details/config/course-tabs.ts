/**
 * Course tab configuration
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
  | 'chat'
  | 'grades'
  | 'reviews';

export interface CourseTabDef {
  id: CourseTabId;
  label: string;
  icon?: string;
  badge?: number;
  disabled?: boolean;
  visible?: boolean;
}

/**
 * Default course tabs for teacher view
 */
export const TEACHER_COURSE_TABS: CourseTabDef[] = [
  { id: 'overview', label: 'Overview', visible: true },
  { id: 'announcements', label: 'Announcements', visible: true },
  { id: 'assignments', label: 'Assignments', visible: true },
  { id: 'quizzes', label: 'Quizzes', visible: true },
  { id: 'resources', label: 'Resources', visible: true },
  { id: 'gradebook', label: 'Gradebook', visible: true },
  { id: 'feed', label: 'Feed', visible: true },
  { id: 'roster', label: 'Roster', visible: true },
  { id: 'groups', label: 'Groups', visible: true },
  { id: 'chat', label: 'Chat', visible: true },
];

/**
 * Default course tabs for student view
 */
export const STUDENT_COURSE_TABS: CourseTabDef[] = [
  { id: 'overview', label: 'Overview', visible: true },
  { id: 'announcements', label: 'Announcements', visible: true },
  { id: 'assignments', label: 'Assignments', visible: true },
  { id: 'quizzes', label: 'Quizzes', visible: true },
  { id: 'resources', label: 'Resources', visible: true },
  { id: 'feed', label: 'Feed', visible: true },
  { id: 'roster', label: 'Roster', visible: true },
  { id: 'groups', label: 'Groups', visible: true },
  { id: 'chat', label: 'Chat', visible: true },
];
