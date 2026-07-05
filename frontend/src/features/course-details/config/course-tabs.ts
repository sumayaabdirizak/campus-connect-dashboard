import type { LucideIcon } from 'lucide-react';
import {
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Newspaper,
  UserCheck,
  Users
} from 'lucide-react';

export type CourseTabId =
  | 'overview'
  | 'feed'
  | 'assignments'
  | 'quizzes'
  | 'resources'
  | 'groups'
  | 'roster'
  | 'grades'
  | 'reviews';

export interface CourseTabDef {
  id: CourseTabId;
  label: string;
  icon: LucideIcon;
  /** Visible to students (default true). Set false for instructor-only tabs. */
  studentVisible?: boolean;
  /** Keyboard shortcut index (1–9) when shown in order */
  shortcut?: number;
}

export const COURSE_TABS: CourseTabDef[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, shortcut: 1 },
  { id: 'feed', label: 'Feed', icon: Newspaper, shortcut: 2 },
  { id: 'assignments', label: 'Assignments', icon: FileText, shortcut: 3 },
  { id: 'quizzes', label: 'Quizzes', icon: ClipboardCheck, shortcut: 4 },
  { id: 'resources', label: 'Resources', icon: FolderOpen, shortcut: 5 },
  { id: 'groups', label: 'Groups', icon: Users, shortcut: 6 },
  { id: 'roster', label: 'Roster', icon: UserCheck, studentVisible: false, shortcut: 7 },
  { id: 'grades', label: 'Grades', icon: GraduationCap, studentVisible: false, shortcut: 8 },
  { id: 'reviews', label: 'Reviews', icon: ClipboardList, studentVisible: false, shortcut: 9 }
];

export function getVisibleCourseTabs(isStudent: boolean): CourseTabDef[] {
  return COURSE_TABS.filter((tab) => !isStudent || tab.studentVisible !== false);
}

export function isValidCourseTab(id: string, isStudent: boolean): id is CourseTabId {
  return getVisibleCourseTabs(isStudent).some((t) => t.id === id);
}
