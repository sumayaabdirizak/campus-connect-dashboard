import type { PlatformAnalytics } from '@/lib/admin/services';
import { kpisRow, sectionHtml, tableHtml } from '@/lib/reports/services/report-print-helpers';
import { escapeHtml, printHtmlDocument } from '@/lib/reports/services/report-print-shell';

function formatScopeSummary(scope: PlatformAnalytics['scope']): string {
  const parts: string[] = [];
  if (scope.facultyName) parts.push(scope.facultyName);
  else parts.push('All faculties');
  parts.push(scope.periodLabel.toLowerCase());
  return parts.join(' · ');
}

export interface ReportCatalogItem {
  id: string;
  name: string;
  category: 'Academic' | 'Users' | 'Courses' | 'Assessment' | 'Operations';
  description: string;
  status: 'ready' | 'generating';
}

export function buildReportCatalog(data?: PlatformAnalytics): ReportCatalogItem[] {
  const period = data?.scope.periodLabel ?? 'Last 6 months';
  return [
    {
      id: 'academic-performance',
      name: 'Academic Performance Summary',
      category: 'Academic',
      description: `LMS-derived GPA and on-time submission trends for ${period.toLowerCase()} (not university SIS grades).`,
      status: 'ready',
    },
    {
      id: 'user-engagement',
      name: 'User Engagement Report',
      category: 'Users',
      description: 'Registrations, LMS logins, and role distribution across the platform.',
      status: 'ready',
    },
    {
      id: 'course-enrollment',
      name: 'Course Enrollment Analysis',
      category: 'Courses',
      description: 'Course offerings with enrollment and LMS completion signals.',
      status: 'ready',
    },
    {
      id: 'assessment-overview',
      name: 'Assessment Overview',
      category: 'Assessment',
      description: 'LMS quiz and assignment volume, scores, and pass/fail trends.',
      status: 'ready',
    },
    {
      id: 'platform-usage',
      name: 'Platform Usage Report',
      category: 'Operations',
      description: 'Daily visits, messaging volume, and resource views in Campus Connect.',
      status: 'ready',
    },
    {
      id: 'department-comparison',
      name: 'Department Comparison',
      category: 'Academic',
      description: 'Department-level LMS performance and completion benchmarks.',
      status: 'ready',
    },
  ];
}

function trendLabel(value?: number): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value}%`;
}

function fmtNum(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '0';
  return value.toLocaleString();
}

function fmtPct(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '0%';
  return `${value}%`;
}

/** Full printable HTML for the platform analytics dashboard. */
export function buildPlatformAnalyticsPrintHtml(
  data: PlatformAnalytics,
  catalog: ReportCatalogItem[]
): string {
  const k = data.kpis;
  const c = data.charts;
  const scope = formatScopeSummary(data.scope);

  const header = `
    <div class="inv-title-row">
      <h1>Reports &amp; Analytics</h1>
      <p class="inv-sub">${escapeHtml(scope)} · Generated ${escapeHtml(new Date().toLocaleString())}</p>
    </div>
  `;

  const platform = sectionHtml(
    'Platform overview',
    tableHtml(
      ['Metric', 'Count'],
      [
        ['Faculties', fmtNum(data.platform.faculties)],
        ['Departments', fmtNum(data.platform.departments)],
        ['Programs', fmtNum(data.platform.programs)],
        ['Students', fmtNum(data.platform.students)],
        ['Teachers', fmtNum(data.platform.teachers)],
        ['Course offerings', fmtNum(data.platform.offerings)],
        ['Clubs', fmtNum(data.platform.clubs)],
        ['Announcements', fmtNum(data.platform.announcements)],
      ]
    )
  );

  const kpis = sectionHtml(
    'Key metrics',
    kpisRow([
      { label: 'Total users', value: `${fmtNum(k.totalUsers)} (${trendLabel(k.trends.totalUsers)})` },
      { label: 'Active users', value: `${fmtNum(k.activeUsersThisMonth)} (${trendLabel(k.trends.activeUsers)})` },
      { label: 'Total courses', value: `${fmtNum(k.totalCourses)} (${trendLabel(k.trends.totalCourses)})` },
      { label: 'Submissions', value: `${fmtNum(k.assignmentsSubmitted)} (${trendLabel(k.trends.assignmentsSubmitted)})` },
      { label: 'Quiz attempts', value: `${fmtNum(k.quizAttempts)} (${trendLabel(k.trends.quizAttempts)})` },
      { label: 'Completion rate', value: `${fmtPct(k.completionRate)} (${trendLabel(k.trends.completionRate)})` },
      { label: 'System usage', value: `${fmtNum(k.dailyActiveSessions)} (${trendLabel(k.trends.dailyActiveSessions)})` },
      { label: 'On-time submissions', value: fmtPct(k.onTimeSubmissions) },
      { label: 'Quiz pass rate', value: fmtPct(k.quizPassRate) },
      { label: 'Resource views', value: fmtNum(k.resourceViews) },
      { label: 'Messages exchanged', value: fmtNum(k.messagesExchanged) },
      { label: 'Announcement reach', value: fmtNum(k.announcementReach) },
    ])
  );

  const userGrowth = sectionHtml(
    'User growth by month',
    tableHtml(
      ['Month', 'Registrations', 'Active users'],
      c.userGrowthDetailed.map((row) => [row.month, fmtNum(row.registrations), fmtNum(row.active)])
    )
  );

  const coursePerformance = sectionHtml(
    'Course performance',
    tableHtml(
      ['Course', 'Name', 'Enrollments', 'Completions', 'Dropouts'],
      c.coursePerformance.map((row) => [
        row.course,
        row.name,
        fmtNum(row.enrollments),
        fmtNum(row.completions),
        fmtNum(row.dropouts),
      ])
    )
  );

  const assignmentAnalytics = sectionHtml(
    'Assignment analytics',
    tableHtml(
      ['Status', 'Count'],
      [
        ['Submitted', fmtNum(c.assignmentAnalytics.submitted)],
        ['Pending', fmtNum(c.assignmentAnalytics.pending)],
        ['Late', fmtNum(c.assignmentAnalytics.late)],
      ]
    )
  );

  const quizPerformance = sectionHtml(
    'Quiz performance',
    tableHtml(
      ['Metric', 'Value'],
      [
        ['Average score', fmtPct(c.quizPerformance.averageScore)],
        ['Pass rate', fmtPct(c.quizPerformance.passRate)],
        ['Fail rate', fmtPct(c.quizPerformance.failRate)],
        ['Passed attempts', fmtNum(c.quizPerformance.passed)],
        ['Failed attempts', fmtNum(c.quizPerformance.failed)],
        ['Total attempts', fmtNum(c.quizPerformance.total)],
      ]
    )
  );

  const departmentPerformance = sectionHtml(
    'Department performance',
    tableHtml(
      ['Department', 'Students', 'Completion rate'],
      c.departmentPerformance.map((row) => [row.name, fmtNum(row.students), fmtPct(row.completionRate)])
    )
  );

  const systemUsage = sectionHtml(
    'System usage by day',
    tableHtml(
      ['Day', 'Visits'],
      c.systemUsage.map((row) => [row.day, fmtNum(row.visits)])
    )
  );

  const communicationActivity = sectionHtml(
    'Communication activity by month',
    tableHtml(
      ['Month', 'Messages'],
      c.communicationActivity.map((row) => [row.month, fmtNum(row.messages)])
    )
  );

  const learningProgress = sectionHtml(
    'Learning progress by month',
    tableHtml(
      ['Month', 'Completion %'],
      c.learningProgress.map((row) => [
        row.month,
        row.completion == null ? '—' : fmtPct(row.completion),
      ])
    )
  );

  const submissionsByCourse = sectionHtml(
    'Submissions by course',
    tableHtml(
      ['Course', 'Name', 'On time', 'Late', 'Missing'],
      c.submissionsByCourse.map((row) => [
        row.course,
        row.name,
        fmtNum(row.onTime),
        fmtNum(row.late),
        fmtNum(row.missing),
      ])
    )
  );

  const quizScoreDistribution = sectionHtml(
    'Quiz score distribution',
    tableHtml(
      ['Score range', 'Attempts'],
      c.quizScoreDistribution.map((row) => [row.range, fmtNum(row.count)])
    )
  );

  const gradeDistribution = sectionHtml(
    'Grade distribution',
    tableHtml(
      ['Grade', 'Count'],
      c.gradeDistribution.map((row) => [row.grade, fmtNum(row.count)])
    )
  );

  const courseCompletion = sectionHtml(
    'Course completion rates',
    tableHtml(
      ['Course', 'Name', 'Completion %'],
      c.courseCompletion.map((row) => [row.course, row.name, fmtPct(row.completion)])
    )
  );

  const usersByFaculty = sectionHtml(
    'Users by faculty',
    tableHtml(
      ['Faculty', 'Users'],
      c.usersByFaculty.map((row) => [row.name, fmtNum(row.users)])
    )
  );

  const messagesByScope = sectionHtml(
    'Messages by scope',
    tableHtml(
      ['Scope', 'Messages'],
      c.messagesByScope.map((row) => [row.name, fmtNum(row.messages)])
    )
  );

  const roleDistribution = sectionHtml(
    'Role distribution',
    tableHtml(
      ['Role', 'Users'],
      c.roleDistribution.map((row) => [row.role, fmtNum(row.count)])
    )
  );

  const mostActiveCourses = sectionHtml(
    'Most active courses',
    tableHtml(
      ['Course', 'Name', 'Messages', 'Posts'],
      c.mostActiveCourses.map((row) => [
        row.code,
        row.name,
        fmtNum(row.messages),
        fmtNum(row.posts),
      ])
    )
  );

  const insights =
    data.insights.length > 0
      ? sectionHtml(
          'Insights',
          `<ul>${data.insights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        )
      : '';

  const recentActivity = sectionHtml(
    'Recent activity',
    tableHtml(
      ['User', 'Action', 'Type', 'Timestamp'],
      data.recentActivity.map((row) => [
        row.user,
        row.action,
        row.type,
        new Date(row.timestamp).toLocaleString(),
      ])
    )
  );

  const catalogSection = sectionHtml(
    'Report catalog',
    tableHtml(
      ['Report', 'Category', 'Status', 'Period', 'Description'],
      catalog.map((row) => [
        row.name,
        row.category,
        row.status,
        data.scope.periodLabel,
        row.description,
      ])
    )
  );

  return [
    header,
    platform,
    kpis,
    userGrowth,
    coursePerformance,
    assignmentAnalytics,
    quizPerformance,
    departmentPerformance,
    systemUsage,
    communicationActivity,
    learningProgress,
    submissionsByCourse,
    quizScoreDistribution,
    gradeDistribution,
    courseCompletion,
    usersByFaculty,
    messagesByScope,
    roleDistribution,
    mostActiveCourses,
    insights,
    recentActivity,
    catalogSection,
    `<div class="footer"><span><strong>Campus Connect</strong> — Platform analytics export</span><span>${escapeHtml(scope)}</span></div>`,
  ].join('');
}

export function reportsToCsv(reports: ReportCatalogItem[], generatedAt: string): string {
  const header = 'Report Name,Category,Description,Status,Generated At';
  const rows = reports.map((r) =>
    [r.name, r.category, r.description, r.status, generatedAt]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadReportsCsv(reports: ReportCatalogItem[]) {
  const csv = reportsToCsv(reports, new Date().toISOString());
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'admin-reports.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function printPlatformAnalyticsPdf(data: PlatformAnalytics, catalog: ReportCatalogItem[]) {
  printHtmlDocument('Reports & Analytics', buildPlatformAnalyticsPrintHtml(data, catalog));
}
