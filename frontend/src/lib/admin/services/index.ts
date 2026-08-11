import { apiClient } from '@/lib/api-client';
import type {
  AdminAnalyticsFilters,
  AdminAuditLogFilters,
  AdminFaculty,
  AuditActorOption,
  PlatformAnalytics,
  PlatformAuditLogsResponse,
  PlatformAuditStats,
} from '../types';

const BASE = '/admin';

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
    return normalizePlatformAnalytics(result)!;
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

export type ReportKpiTone = 'sky' | 'emerald' | 'violet' | 'indigo' | 'amber' | 'rose';

export type {
  AdminReportPeriod,
  AdminAnalyticsFilters,
  PlatformAnalytics,
  AdminFaculty,
  AdminAuditSource,
  AuditActionType,
  AuditSeverity,
  AuditStatus,
  AuditModule,
  AdminAuditLogFilters,
  PlatformAuditLogEntry,
  PlatformAuditLogsResponse,
  PlatformAuditStats,
  AuditActorOption,
} from '../types';

function normalizePlatformAnalytics(
  raw: PlatformAnalytics | null | undefined
): PlatformAnalytics | undefined {
  if (!raw) return undefined;

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
