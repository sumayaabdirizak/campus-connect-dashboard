export const REPORT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'courses', label: 'Courses' },
  { id: 'communication', label: 'Communication' },
  { id: 'usage', label: 'Usage' },
  { id: 'students', label: 'Students' },
  { id: 'user-logs', label: 'User Logs' },
  { id: 'teacher-activity', label: 'Teacher Activity' },
] as const;

export type ReportTabId = (typeof REPORT_TABS)[number]['id'];
