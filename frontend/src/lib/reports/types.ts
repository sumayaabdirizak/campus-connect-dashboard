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
