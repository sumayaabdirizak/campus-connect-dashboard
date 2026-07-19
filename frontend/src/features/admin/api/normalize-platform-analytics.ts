import type { PlatformAnalytics } from './admin-api-types';

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
