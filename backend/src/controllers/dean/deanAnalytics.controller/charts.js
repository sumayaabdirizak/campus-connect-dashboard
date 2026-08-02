import { prisma } from "../../../db/prisma.js";
import { safe, toMonthKey } from "./helpers.js";

/**
 * Computes the chart series shown on the dean analytics dashboard, reusing
 * the offerings/courses/quiz-attempts/graded-submissions already fetched by
 * {@link computeFacultyKpis}.
 */
export async function computeFacultyCharts({
  facultyId,
  offerings,
  offeringIds,
  uniqueCourses,
  allQuizAttempts,
  gradedSubmissions,
  sixMonthsAgo,
  months,
}) {
  // ── 3. Submissions by course ─────────────────────────────────────────────
  const submissionsByCourse = await Promise.all(
    uniqueCourses.slice(0, 6).map(async (course) => {
      const ids = offerings.filter(o => o.courseId === course.id).map(o => o.id);
      if (!ids.length) return { course: course.code, onTime: 0, late: 0 };
      const [onTime, late] = await Promise.all([
        safe(() => prisma.submission.count({ where: { assignment: { courseOfferingId: { in: ids } }, lateState: 'ON_TIME' } }), 0),
        safe(() => prisma.submission.count({ where: { assignment: { courseOfferingId: { in: ids } }, lateState: 'LATE' } }), 0),
      ]);
      return { course: course.code, onTime, late };
    })
  );

  // ── 4. Quiz score distribution ───────────────────────────────────────────
  const quizScoreDistribution = [
    { range: '90-100', count: allQuizAttempts.filter(a => (a.score ?? 0) >= 90).length },
    { range: '80-89', count: allQuizAttempts.filter(a => (a.score ?? 0) >= 80 && (a.score ?? 0) < 90).length },
    { range: '70-79', count: allQuizAttempts.filter(a => (a.score ?? 0) >= 70 && (a.score ?? 0) < 80).length },
    { range: '60-69', count: allQuizAttempts.filter(a => (a.score ?? 0) >= 60 && (a.score ?? 0) < 70).length },
    { range: '<60', count: allQuizAttempts.filter(a => (a.score ?? 0) < 60).length },
  ];

  // ── 5. Grade distribution ────────────────────────────────────────────────
  const gradeDistribution = [
    { grade: 'A', count: gradedSubmissions.filter(s => (s.grade ?? 0) >= 90).length },
    { grade: 'B', count: gradedSubmissions.filter(s => (s.grade ?? 0) >= 80 && (s.grade ?? 0) < 90).length },
    { grade: 'C', count: gradedSubmissions.filter(s => (s.grade ?? 0) >= 70 && (s.grade ?? 0) < 80).length },
    { grade: 'D', count: gradedSubmissions.filter(s => (s.grade ?? 0) >= 60 && (s.grade ?? 0) < 70).length },
    { grade: 'F', count: gradedSubmissions.filter(s => (s.grade ?? 0) < 60).length },
  ];

  // ── 6. Course completion (avg quiz score per course) ──────────────────────
  const courseCompletion = await Promise.all(
    uniqueCourses.slice(0, 6).map(async (course) => {
      const ids = offerings.filter(o => o.courseId === course.id).map(o => o.id);
      if (!ids.length) return { course: course.code, name: course.name, completion: 0 };
      const attempts = await safe(() => prisma.quizAttempt.findMany({
        where: { quiz: { courseOfferingId: { in: ids } } },
        select: { score: true }
      }), []);
      const completion = attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length)
        : 0;
      return { course: course.code, name: course.name, completion };
    })
  );

  // ── 7. Monthly trends ────────────────────────────────────────────────────
  const [recentMsgDates, recentSubmDates] = await Promise.all([
    safe(() => prisma.discussionMessage.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo },
        sender: { studentProfile: { facultyId } }
      },
      select: { createdAt: true }
    }), []),

    safe(() => offeringIds.length
      ? prisma.submission.findMany({
          where: {
            assignment: { courseOfferingId: { in: offeringIds } },
            submitted_at: { gte: sixMonthsAgo },
          },
          select: {
            submitted_at: true,
            gradeRow: { select: { score: true } },
          },
        }).then((rows) =>
          rows.map((s) => ({ submitted_at: s.submitted_at, grade: s.gradeRow?.score ?? null })),
        )
      : [], []),
  ]);

  // Group by month
  const msgByMonth = {};
  for (const m of recentMsgDates) {
    const k = toMonthKey(m.createdAt);
    msgByMonth[k] = (msgByMonth[k] ?? 0) + 1;
  }

  const gradeByMonth = {};
  for (const s of recentSubmDates) {
    const k = toMonthKey(s.submitted_at);
    if (!gradeByMonth[k]) gradeByMonth[k] = [];
    gradeByMonth[k].push(s.grade ?? 0);
  }

  const communicationActivity = months.map(({ label, key }) => ({
    month: label,
    messages: msgByMonth[key] ?? 0
  }));

  const learningProgress = months.map(({ label, key }) => {
    const grades = gradeByMonth[key] ?? [];
    return {
      month: label,
      completion: grades.length > 0
        ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length)
        : null
    };
  });

  return {
    communicationActivity,
    learningProgress,
    submissionsByCourse,
    quizScoreDistribution,
    gradeDistribution,
    courseCompletion,
  };
}
