import { buildAssessmentReports } from './assessment.js';
import { assembleDeanReport } from './assembleReport.js';
import { buildEngagementCharts, buildInstructorPerformanceChart } from './engagementCharts.js';
import { buildCourseAnalytics } from './courseAnalytics.js';
import { buildDepartmentAnalytics } from './departmentAnalytics.js';
import { fetchReportCollections } from './fetchCollections.js';
import { fetchReportCounts } from './fetchCounts.js';
import { buildInsights, buildRecentActivity } from './insights.js';
import {
  buildEnrollmentTrends,
  buildPerformanceDistribution,
  computeKpis,
} from './kpis.js';
import { loadReportScope } from './loadScope.js';
import { buildInstructorReports, buildStudentReports } from './peopleReports.js';
import { buildRiskSections } from './risks.js';

/**
 * @param {{ facultyId: number; periodMonths?: number; filters?: Record<string, string | number | null> }} opts
 */
export async function buildDeanReports({ facultyId, periodMonths = 6, filters = {} } = {}) {
  const scope = await loadReportScope({ facultyId, periodMonths, filters });
  const {
    monthsCount,
    faculty,
    departments,
    offerings,
    offeringIds,
    uniqueCourses,
    since,
    months,
    prevSince,
  } = scope;

  const scopedDepartments = departments.filter((d) => scope.deptIds.includes(d.id));

  const [counts, collections] = await Promise.all([
    fetchReportCounts({ facultyId, deptIds: scope.deptIds, offeringIds, since, prevSince }),
    fetchReportCollections({
      facultyId,
      offeringIds,
      since,
      prevSince,
      filters: scope.filters ?? filters,
    }),
  ]);

  const {
    allQuizAttempts,
    gradedSubmissions,
    studentProfiles,
    registrations,
    prevRegistrations,
    teachers,
    courseAccessRows,
    recentSubmissions,
    resourceCount,
    resourceViews,
  } = collections;

  const kpis = computeKpis({
    gradedSubmissions,
    totalSubmissions: counts.totalSubmissions,
    onTimeSubmissions: counts.onTimeSubmissions,
    allQuizAttempts,
    activeStudents: counts.activeStudents,
    registrations,
    prevRegistrations,
  });

  const performanceDistribution = buildPerformanceDistribution(gradedSubmissions);
  const enrollmentTrends = buildEnrollmentTrends({
    months,
    enrollmentByMonth: kpis.enrollmentByMonth,
    inactiveStudents: counts.inactiveStudents,
    monthsCount,
  });

  const { topCourses, bottomCourses, courseReports } = await buildCourseAnalytics({
    uniqueCourses,
    offerings,
    allQuizAttempts,
    gradedSubmissions,
    courseAccessRows,
  });

  const { departmentPerformance, rankedDepartments } = await buildDepartmentAnalytics({
    departments: scopedDepartments,
    offerings,
    uniqueCourses,
    gradedSubmissions,
    allQuizAttempts,
    studentProfiles,
    teachers,
  });

  const studentReports = buildStudentReports({
    studentProfiles,
    departments,
    gradedSubmissions,
    recentSubmissions,
    onTimeRate: kpis.onTimeRate,
    filters: scope.filters ?? filters,
  });

  const instructorReports = buildInstructorReports({ teachers, offerings, allQuizAttempts });

  const { dailyEngagement, monthlyEngagement, departmentEngagement } = buildEngagementCharts({
    recentSubmissions,
    months,
    offerings,
  });

  const instructorPerformance = buildInstructorPerformanceChart(instructorReports);

  const { studentsAtRisk, coursesAtRisk, departmentsAtRisk } = buildRiskSections({
    studentReports,
    bottomCourses,
    rankedDepartments,
  });

  const insights = buildInsights({
    rankedDepartments,
    enrollmentTrend: kpis.enrollmentTrend,
    onTimeRate: kpis.onTimeRate,
    studentsAtRisk,
    coursesAtRisk,
  });

  const recentActivity = buildRecentActivity({ faculty, studentsAtRisk, coursesAtRisk });

  const assessmentReports = buildAssessmentReports({
    totalSubmissions: counts.totalSubmissions,
    activeStudents: counts.activeStudents,
    quizPassRate: kpis.quizPassRate,
    gradedSubmissions,
    allQuizAttempts,
    resourceCount: resourceCount ?? 0,
    resourceViews: resourceViews ?? [],
  });

  return assembleDeanReport({
    facultyId,
    monthsCount,
    faculty,
    departments,
    counts,
    kpis,
    offerings,
    allQuizAttempts,
    enrollmentTrends,
    departmentPerformance,
    topCourses,
    bottomCourses,
    performanceDistribution,
    dailyEngagement,
    monthlyEngagement,
    departmentEngagement,
    instructorPerformance,
    studentReports,
    instructorReports,
    courseReports,
    rankedDepartments,
    assessmentReports,
    studentsAtRisk,
    coursesAtRisk,
    departmentsAtRisk,
    insights,
    recentActivity,
  });
}
