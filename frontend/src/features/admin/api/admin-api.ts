import { apiClient } from '@/lib/api-client';

const BASE = '/admin';

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

const DEFAULT_KPI_TRENDS: PlatformAnalytics['kpis']['trends'] = {
  totalUsers: 0,
  activeUsers: 0,
  totalCourses: 0,
  assignmentsSubmitted: 0,
  quizAttempts: 0,
  completionRate: 0,
  dailyActiveSessions: 0,
};

const DEFAULT_ASSIGNMENT_ANALYTICS: PlatformAnalytics['charts']['assignmentAnalytics'] = {
  submitted: 0,
  pending: 0,
  late: 0,
};

const DEFAULT_QUIZ_PERFORMANCE: PlatformAnalytics['charts']['quizPerformance'] = {
  averageScore: 0,
  passRate: 0,
  failRate: 0,
  passed: 0,
  failed: 0,
  total: 0,
};

/** Backfill fields added after v1 analytics so stale cache / older API payloads cannot crash UI. */
export function normalizePlatformAnalytics(
  raw: PlatformAnalytics | null | undefined
): PlatformAnalytics | undefined {
  if (!raw) return undefined;

  const charts = raw.charts ?? ({} as PlatformAnalytics['charts']);
  const kpis = raw.kpis ?? ({} as PlatformAnalytics['kpis']);
  const userGrowth = charts.userGrowth ?? [];

  return {
    ...raw,
    kpis: {
      ...kpis,
      totalUsers: kpis.totalUsers ?? kpis.activeUsers ?? 0,
      activeUsersThisMonth: kpis.activeUsersThisMonth ?? kpis.activeUsers ?? 0,
      totalCourses: kpis.totalCourses ?? 0,
      quizAttempts: kpis.quizAttempts ?? 0,
      completionRate: kpis.completionRate ?? kpis.avgCourseCompletion ?? 0,
      dailyActiveSessions: kpis.dailyActiveSessions ?? 0,
      trends: { ...DEFAULT_KPI_TRENDS, ...kpis.trends },
    },
    charts: {
      ...charts,
      communicationActivity: charts.communicationActivity ?? [],
      learningProgress: charts.learningProgress ?? [],
      userGrowth,
      userGrowthDetailed:
        charts.userGrowthDetailed ??
        userGrowth.map((u) => ({
          month: u.month,
          registrations: u.users,
          active: u.users,
        })),
      submissionsByCourse: charts.submissionsByCourse ?? [],
      quizScoreDistribution: charts.quizScoreDistribution ?? [],
      gradeDistribution: charts.gradeDistribution ?? [],
      courseCompletion: charts.courseCompletion ?? [],
      usersByFaculty: charts.usersByFaculty ?? [],
      messagesByScope: charts.messagesByScope ?? [],
      roleDistribution: charts.roleDistribution ?? [],
      mostActiveCourses: charts.mostActiveCourses ?? [],
      coursePerformance: charts.coursePerformance ?? [],
      assignmentAnalytics: {
        ...DEFAULT_ASSIGNMENT_ANALYTICS,
        ...charts.assignmentAnalytics,
      },
      quizPerformance: { ...DEFAULT_QUIZ_PERFORMANCE, ...charts.quizPerformance },
      departmentPerformance: charts.departmentPerformance ?? [],
      systemUsage: charts.systemUsage ?? [],
    },
    insights: raw.insights ?? [],
    recentActivity: raw.recentActivity ?? [],
  };
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

export const adminApi = {
  getAnalytics: async (filters: AdminAnalyticsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.facultyId != null) {
      params.set('facultyId', String(filters.facultyId));
    }
    if (filters.period) {
      params.set('period', filters.period);
    }
    const qs = params.toString();
    const result = await apiClient<PlatformAnalytics>(`${BASE}/analytics${qs ? `?${qs}` : ''}`);
    const normalized = normalizePlatformAnalytics(result)!;
    return normalized;
  },
  getFaculties: () => apiClient<{ results: AdminFaculty[] }>(`${BASE}/faculties`),
  getAuditLogs: (filters: AdminAuditLogFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.source && filters.source !== 'all') params.set('source', filters.source);
    if (filters.module && filters.module !== 'all') params.set('module', filters.module);
    if (filters.actionType && filters.actionType !== 'all') params.set('actionType', filters.actionType);
    if (filters.severity && filters.severity !== 'all') params.set('severity', filters.severity);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.page != null) params.set('page', String(filters.page));
    if (filters.pageSize != null) params.set('pageSize', String(filters.pageSize));
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.search) params.set('search', filters.search);
    if (filters.actorId != null) params.set('actorId', String(filters.actorId));
    const qs = params.toString();
    return apiClient<PlatformAuditLogsResponse>(`${BASE}/audit-logs${qs ? `?${qs}` : ''}`);
  },
  getAuditStats: () => apiClient<PlatformAuditStats>(`${BASE}/audit-logs/stats`),
  getAuditActors: () => apiClient<{ results: AuditActorOption[] }>(`${BASE}/audit-logs/actors`),
};
