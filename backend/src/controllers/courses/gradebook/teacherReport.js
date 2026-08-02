import { prisma } from '../../../db/prisma.js';
import { computeKpis, buildPerformanceDistribution } from '../../../services/dean-reports/kpis.js';
import { buildEngagementCharts } from '../../../services/dean-reports/engagementCharts.js';
import { monthSeries, periodStart } from '../../../services/dean-reports/helpers.js';

const REPORT_MONTHS = 6;

/**
 * Class-wide performance report for a single course offering (teacher/dean
 * only, scoped by `requireCourseOfferingManage`). Reuses the pure aggregation
 * helpers from dean-reports/ (computeKpis, buildPerformanceDistribution,
 * buildEngagementCharts) fed with this offering's own data instead of a
 * faculty-wide fetch.
 */
export async function getTeacherCourseReport(req, res) {
  const offering = req.courseOffering;
  const since = periodStart(REPORT_MONTHS);

  const [section, assignments, quizzes] = await Promise.all([
    prisma.batchSection.findUnique({
      where: { id: offering.sectionId },
      include: {
        studentRegistrations: {
          include: { student: { select: { id: true, full_name: true } } },
        },
      },
    }),
    prisma.assignment.findMany({
      where: { courseOfferingId: offering.id, lifecycle: { publishStatus: 'PUBLISHED' } },
      select: { id: true, maxMarks: true },
    }),
    prisma.quiz.findMany({
      where: { courseOfferingId: offering.id, is_draft: false },
      select: { id: true, passing_score: true },
    }),
  ]);

  const students = section?.studentRegistrations?.map((r) => r.student) ?? [];
  const assignmentIds = assignments.map((a) => a.id);
  const quizIds = quizzes.map((q) => q.id);
  const maxMarksById = new Map(assignments.map((a) => [a.id, a.maxMarks || 100]));

  const [submissions, attempts] = await Promise.all([
    assignmentIds.length
      ? prisma.submission.findMany({
          where: { assignmentId: { in: assignmentIds }, submitted_at: { gte: since } },
          select: {
            assignmentId: true,
            studentId: true,
            lateState: true,
            submitted_at: true,
            gradeRow: { select: { score: true } },
          },
        })
      : Promise.resolve([]),
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: { quizId: { in: quizIds }, submitted_at: { not: null, gte: since } },
          select: {
            quizId: true,
            studentId: true,
            grade: true,
            score: true,
            quiz: { select: { passing_score: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Per-item percentages (assignment scores normalised against maxMarks;
  // quiz grades already stored as a percentage) feed both the KPI averages
  // and the grade-band histogram.
  const gradedSubmissions = [];
  for (const s of submissions) {
    const rawGrade = s.gradeRow?.score ?? null;
    if (rawGrade == null) continue;
    const maxMarks = maxMarksById.get(s.assignmentId) || 100;
    gradedSubmissions.push({ grade: (rawGrade / maxMarks) * 100 });
  }
  for (const a of attempts) {
    const pct = a.grade ?? a.score ?? null;
    if (pct != null) gradedSubmissions.push({ grade: pct });
  }

  const onTimeSubmissions = submissions.filter((s) => s.lateState !== 'LATE').length;

  const kpis = computeKpis({
    gradedSubmissions,
    totalSubmissions: submissions.length,
    onTimeSubmissions,
    allQuizAttempts: attempts,
    activeStudents: students.length,
    registrations: [],
    prevRegistrations: [],
  });

  const performanceDistribution = buildPerformanceDistribution(gradedSubmissions);

  const recentSubmissions = submissions.map((s) => ({
    submitted_at: s.submitted_at,
    lateState: s.lateState,
    courseOfferingId: offering.id,
  }));
  const { dailyEngagement, monthlyEngagement } = buildEngagementCharts({
    recentSubmissions,
    months: monthSeries(REPORT_MONTHS),
    offerings: [],
  });

  // Per-student overall %, to flag students who need attention.
  const subByStudent = new Map();
  for (const s of submissions) {
    const rawGrade = s.gradeRow?.score ?? null;
    if (rawGrade == null) continue;
    const maxMarks = maxMarksById.get(s.assignmentId) || 100;
    const list = subByStudent.get(s.studentId) ?? [];
    list.push((rawGrade / maxMarks) * 100);
    subByStudent.set(s.studentId, list);
  }
  for (const a of attempts) {
    const pct = a.grade ?? a.score ?? null;
    if (pct == null) continue;
    const list = subByStudent.get(a.studentId) ?? [];
    list.push(pct);
    subByStudent.set(a.studentId, list);
  }
  const atRiskStudents = students
    .map((student) => {
      const pcts = subByStudent.get(student.id) ?? [];
      const overallPct = pcts.length ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;
      return { studentId: student.id, name: student.full_name, overallPct };
    })
    .filter((s) => s.overallPct != null && s.overallPct < 60)
    .sort((a, b) => a.overallPct - b.overallPct)
    .slice(0, 10);

  res.json({
    kpis: {
      avgGpa: kpis.avgGpa,
      onTimeRate: kpis.attendanceRate,
      quizPassRate: kpis.quizPassRate,
      courseCompletionRate: kpis.courseCompletionRate,
    },
    performanceDistribution,
    engagement: { daily: dailyEngagement, monthly: monthlyEngagement },
    atRiskStudents,
    studentCount: students.length,
  });
}
