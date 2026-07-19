export type AdminReportPeriod = '3m' | '6m' | '12m';

export interface AdminAnalyticsFilters {
  facultyId?: number | null;
  period?: AdminReportPeriod;
}

export interface PlatformAnalytics {
  scope: {
    facultyId: number | null;
    facultyName: string | null;
    facultyCode: string | null;
    periodMonths: number;
    periodLabel: string;
    userSegmentLabel: string;
  };
  platform: {
    faculties: number;
    departments: number;
    programs: number;
    students: number;
    teachers: number;
    offerings: number;
    clubs: number;
    announcements: number;
  };
  kpis: {
    activeUsers: number;
    totalUsers: number;
    activeUsersThisMonth: number;
    totalCourses: number;
    quizAttempts: number;
    completionRate: number;
    dailyActiveSessions: number;
    messagesExchanged: number;
    assignmentsSubmitted: number;
    avgCourseCompletion: number;
    announcementReach: number;
    onTimeSubmissions: number;
    quizPassRate: number;
    resourceViews: number;
    trends: {
      totalUsers: number;
      activeUsers: number;
      totalCourses: number;
      assignmentsSubmitted: number;
      quizAttempts: number;
      completionRate: number;
      dailyActiveSessions: number;
    };
  };
  charts: {
    communicationActivity: { month: string; messages: number }[];
    learningProgress: { month: string; completion: number | null }[];
    userGrowth: { month: string; users: number }[];
    userGrowthDetailed: { month: string; registrations: number; active: number }[];
    submissionsByCourse: {
      course: string;
      name: string;
      onTime: number;
      late: number;
      missing: number;
    }[];
    quizScoreDistribution: { range: string; count: number }[];
    gradeDistribution: { grade: string; count: number }[];
    courseCompletion: { course: string; name: string; completion: number }[];
    usersByFaculty: { name: string; users: number }[];
    messagesByScope: { name: string; messages: number }[];
    roleDistribution: { role: string; count: number }[];
    mostActiveCourses: { code: string; name: string; messages: number; posts: number }[];
    coursePerformance: {
      course: string;
      name: string;
      enrollments: number;
      completions: number;
      dropouts: number;
    }[];
    assignmentAnalytics: { submitted: number; pending: number; late: number };
    quizPerformance: {
      averageScore: number;
      passRate: number;
      failRate: number;
      passed: number;
      failed: number;
      total: number;
    };
    departmentPerformance: { name: string; students: number; completionRate: number }[];
    systemUsage: { day: string; visits: number }[];
  };
  insights: string[];
  recentActivity: {
    id: string;
    type: string;
    user: string;
    action: string;
    timestamp: string;
  }[];
}

export interface AdminFaculty {
  id: number;
  name: string;
  code: string;
}

export type AdminAuditSource = 'all' | 'announcement' | 'discussion' | 'club' | 'sms';

export type AuditActionType =
  | 'all'
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject';

export type AuditSeverity = 'all' | 'info' | 'warning' | 'error' | 'critical';
export type AuditStatus = 'all' | 'success' | 'failed';
export type AuditModule = 'all' | 'Announcements' | 'Discussions' | 'Clubs' | 'Notifications';

export interface AdminAuditLogFilters {
  source?: AdminAuditSource;
  module?: AuditModule;
  actionType?: AuditActionType;
  severity?: AuditSeverity;
  status?: AuditStatus;
  page?: number;
  pageSize?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
  actorId?: number | null;
}

export interface PlatformAuditLogEntry {
  id: string;
  source: Exclude<AdminAuditSource, 'all'>;
  sourceLabel: string;
  module: string;
  action: string;
  actionType: string;
  actionLabel: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'success' | 'failed';
  actorId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | number | null;
  targetLabel: string | null;
  resourceId: string | number | null;
  description: string;
  summary: string | null;
  ipAddress: string | null;
  sessionId: string | null;
  browser: string | null;
  device: string | null;
  operatingSystem: string | null;
  errorMessage: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface PlatformAuditLogsResponse {
  page: number;
  pageSize: number;
  total: number;
  totalCount: number;
  results: PlatformAuditLogEntry[];
}

export interface PlatformAuditStats {
  totalEvents: number;
  todayActivities: number;
  failedActions: number;
  criticalEvents: number;
  activeUsersToday: number;
  trends: {
    todayActivities: number;
    totalEvents: number;
    failedActions: number;
    criticalEvents: number;
    activeUsersToday: number;
  };
}

export interface AuditActorOption {
  id: number;
  fullName: string;
  email: string;
  role: string | null;
}
