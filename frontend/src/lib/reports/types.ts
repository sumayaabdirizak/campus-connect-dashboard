export type UserLoginLogRow = {
  id: number;
  loginAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  userId: number;
  fullName: string;
  email: string;
  role: string | null;
};

export type UserLoginLogsResponse = {
  totalCount: number;
  page: number;
  pageSize: number;
  results: UserLoginLogRow[];
};

export type TeacherActivityRow = {
  userId: number;
  fullName: string;
  email: string;
  department: { id: number; name: string } | null;
  courseCount: number;
  assignmentsCount: number;
  quizzesCount: number;
  gradedCount: number;
  resourcesCount: number;
  feedPostsCount: number;
  chatMessagesCount: number;
  lastLoginAt: string | null;
};

export type UpcomingDeadlineRow = {
  kind: 'ASSIGNMENT' | 'QUIZ';
  id: number;
  title: string;
  dueAt: string;
  courseCode: string | null;
  courseName: string | null;
};

export type OversightScope = 'dean' | 'admin';

// ── Entity-scoped reports ───────────────────────────────────────────────────
// Course / teacher / student / batch / faculty reports, served by
// `GET /api/reports/:scope`. Separate from the oversight types above: those
// describe cross-cutting admin tables, these describe one subject in depth.

export const REPORT_SCOPES = ['course', 'teacher', 'student', 'batch', 'section', 'faculty'] as const;
export type ReportScope = (typeof REPORT_SCOPES)[number];

/** Primary activity reports shown in navigation (dean / super-admin). */
export const ACTIVITY_REPORT_SCOPES: ReportScope[] = [
  'course',
  'section',
  'batch',
  'student',
  'teacher'
];

/** Lecturers: only courses they teach + their own activity. */
export const TEACHER_ACTIVITY_REPORT_SCOPES: ReportScope[] = ['course', 'teacher'];

export function activityReportScopesForRole(role: string | null | undefined): ReportScope[] {
  return role === 'TEACHER' ? TEACHER_ACTIVITY_REPORT_SCOPES : ACTIVITY_REPORT_SCOPES;
}

export const REPORT_SCOPE_META: Record<
  ReportScope,
  { title: string; noun: string; plural: string; blurb: string }
> = {
  course: {
    title: 'Course activity report',
    noun: 'course',
    plural: 'Course activity',
    blurb: 'Activity inside one course offering — quizzes, assignments, resources and the feed.'
  },
  teacher: {
    title: 'Teacher activity report',
    noun: 'teacher',
    plural: 'Teacher activity',
    blurb: 'What a teacher has set up and how their courses are being used.'
  },
  student: {
    title: 'Student activity report',
    noun: 'student',
    plural: 'Student activity',
    blurb: 'One student across every course they are registered on.'
  },
  batch: {
    title: 'Batch activity report',
    noun: 'batch',
    plural: 'Batch activity',
    blurb: 'A whole cohort — every section and course the batch is taking.'
  },
  section: {
    title: 'Section activity report',
    noun: 'section',
    plural: 'Section activity',
    blurb: 'One batch section — students, courses and activity in the period.'
  },
  faculty: {
    title: 'Faculty activity report',
    noun: 'faculty',
    plural: 'Faculty activity',
    blurb: 'Faculty-wide activity, including announcements and clubs.'
  }
};

export interface ReportSubjectOption {
  id: string | number;
  label: string;
  sublabel: string;
}

export interface ReportKpi {
  key: string;
  label: string;
  value: number | null;
  unit?: string;
  domain: string;
}

export interface ReportSection {
  key: string;
  label: string;
  kpis: Omit<ReportKpi, 'domain'>[];
  rows: Record<string, unknown>[];
  breakdown?: { label: string; value: number }[];
}

export interface Report {
  scope: ReportScope;
  subject: {
    id: string | number;
    name: string;
    subtitle: string | null;
    meta: { label: string; value: string }[];
  };
  period: { months: number; since: string | null };
  coverage: { courses: number; students: number | null };
  kpis: ReportKpi[];
  sections: ReportSection[];
}

export const REPORT_PERIODS = [
  { id: '3', label: 'Last 3 months' },
  { id: '6', label: 'Last 6 months' },
  { id: '12', label: 'Last 12 months' },
  { id: 'all', label: 'All time' }
] as const;
