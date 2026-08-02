import { buildKpiSection } from './kpis.js';

export function assembleDeanReport({
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
}) {
  return {
    scope: {
      facultyId,
      facultyName: faculty?.name ?? 'Faculty',
      facultyCode: faculty?.code ?? '',
      periodLabel: `Last ${monthsCount} months`,
      generatedAt: new Date().toISOString(),
    },
    kpis: buildKpiSection({
      departments: rankedDepartments.length ? rankedDepartments : departments,
      counts,
      kpis,
      offerings,
      allQuizAttempts,
      totalSubmissions: counts.totalSubmissions,
    }),
    charts: {
      enrollmentTrends,
      departmentPerformance: departmentPerformance.map((d) => ({
        department: d.code,
        gpa: d.gpa,
        passRate: d.passRate,
        completionRate: d.completionRate,
      })),
      topCourses,
      bottomCourses,
      performanceDistribution,
      // Wire key stays `attendance` for frontend API compatibility, but the
      // data is submission-timeliness engagement, not formal attendance —
      // see engagementCharts.js.
      attendance: {
        daily: dailyEngagement,
        monthly: monthlyEngagement,
        byDepartment: departmentEngagement,
      },
      instructorPerformance,
    },
    tables: {
      academic: {
        deansList: studentReports.filter((s) => s.status === "Dean's List").slice(0, 20),
        probation: studentReports.filter((s) => s.status === 'Probation').slice(0, 20),
        passFail: performanceDistribution,
      },
      students: studentReports,
      instructors: instructorReports,
      courses: courseReports,
      departments: rankedDepartments.map((d, i) => ({ ...d, rank: i + 1 })),
    },
    assessment: assessmentReports,
    risks: {
      students: studentsAtRisk,
      courses: coursesAtRisk,
      departments: departmentsAtRisk,
    },
    insights,
    recentActivity,
    filterOptions: {
      departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
    },
  };
}
