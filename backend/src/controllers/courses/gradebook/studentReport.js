import { prisma } from '../../../db/prisma.js';
import { computeKpis, buildPerformanceDistribution } from '../../../services/dean-reports/kpis.js';
import { buildEngagementCharts } from '../../../services/dean-reports/engagementCharts.js';
import { monthSeries, periodStart } from '../../../services/dean-reports/helpers.js';

const REPORT_MONTHS = 6;

/**
 * Personal performance report for a single course offering, scoped to the
 * requesting student only (`requireCourseOfferingRead`). Same aggregation
 * helpers as the teacher report, fed with just this student's own data.
 */
export async function getStudentCourseReport(req, res) {
  const offering = req.courseOffering;
  const studentId = Number(req.user.sub);
  const since = periodStart(REPORT_MONTHS);

  const [assignments, quizzes] = await Promise.all([
    prisma.assignment.findMany({
      where: { courseOfferingId: offering.id, lifecycle: { publishStatus: 'PUBLISHED' } },
      select: { id: true, maxMarks: true },
    }),
    prisma.quiz.findMany({
      where: { courseOfferingId: offering.id, is_draft: false },
      select: { id: true, passing_score: true },
    }),
  ]);

  const assignmentIds = assignments.map((a) => a.id);
  const quizIds = quizzes.map((q) => q.id);
  const maxMarksById = new Map(assignments.map((a) => [a.id, a.maxMarks || 100]));

  const [submissions, attempts] = await Promise.all([
    assignmentIds.length
      ? prisma.submission.findMany({
          where: {
            assignmentId: { in: assignmentIds },
            studentId,
            submitted_at: { gte: since },
          },
          select: {
            assignmentId: true,
            lateState: true,
            submitted_at: true,
            gradeRow: { select: { score: true } },
          },
        })
      : Promise.resolve([]),
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: {
            quizId: { in: quizIds },
            studentId,
            submitted_at: { not: null, gte: since },
          },
          select: {
            quizId: true,
            grade: true,
            score: true,
            quiz: { select: { passing_score: true } },
          },
        })
      : Promise.resolve([]),
  ]);

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
    activeStudents: 1,
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

  res.json({
    kpis: {
      avgGpa: kpis.avgGpa,
      onTimeRate: kpis.onTimeRate,
      quizPassRate: kpis.quizPassRate,
    },
    performanceDistribution,
    engagement: { daily: dailyEngagement, monthly: monthlyEngagement },
    gradedCount: gradedSubmissions.length,
  });
}
