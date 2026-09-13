import { prisma } from '../../db/prisma.js';
import { safe, facultyUserWhere } from './analytics-helpers.js';
import { aggregateMessagesByBucket } from './helpers/aggregations.js';

export async function runAnalyticsPhaseB(ctx) {
  const {
    scopedFacultyId,
    offeringIds,
    since,
    monthsCount,
    submissionsByCourse,
    totalSubmissions,
    avgScore,
    quizPassRate,
    allQuizAttempts,
    passedQuizzes,
    userSegment,
    courseCompletion,
    userGrowth,
  } = ctx;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsersThisMonth,
    lateSubmissions,
    recentUsers,
    recentSubs,
    recentQuizAttempts,
    dailyMessages,
  ] = await Promise.all([
    safe(
      () =>
        prisma.user.count({
          where: scopedFacultyId ? facultyUserWhere(scopedFacultyId) : {},
        }),
      0
    ),
    safe(
      () =>
        prisma.user.count({
          where: {
            ...(scopedFacultyId ? facultyUserWhere(scopedFacultyId) : {}),
            OR: [{ last_login_at: { gte: monthStart } }, { created_at: { gte: monthStart } }],
          },
        }),
      0
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: offeringIds } }, lateState: 'LATE' },
            })
          : 0,
      0
    ),
    safe(
      () =>
        prisma.user.findMany({
          where: {
            ...(scopedFacultyId ? facultyUserWhere(scopedFacultyId) : {}),
            created_at: { gte: since },
          },
          select: { id: true, full_name: true, created_at: true },
          orderBy: { created_at: 'desc' },
          take: 5,
        }),
      []
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.findMany({
              where: {
                assignment: { courseOfferingId: { in: offeringIds } },
                submitted_at: { gte: since },
              },
              select: {
                id: true,
                submitted_at: true,
                student: { select: { full_name: true } },
                assignment: { select: { title: true } },
              },
              orderBy: { submitted_at: 'desc' },
              take: 5,
            })
          : [],
      []
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.quizAttempt.findMany({
              where: { quiz: { courseOfferingId: { in: offeringIds } }, started_at: { gte: since } },
              select: {
                id: true,
                started_at: true,
                score: true,
                student: { select: { full_name: true } },
                quiz: { select: { title: true } },
              },
              orderBy: { started_at: 'desc' },
              take: 5,
            })
          : [],
      []
    ),
    safe(async () => {
      const rangeStart = new Date(since);
      rangeStart.setHours(0, 0, 0, 0);
      const bucketDays = monthsCount <= 3 ? 1 : monthsCount <= 6 ? 7 : 30;
      const totalDaysToToday = Math.max(
        1,
        Math.ceil((Date.now() - rangeStart.getTime()) / (24 * 60 * 60 * 1000))
      );
      const bucketCount = Math.max(1, Math.ceil(totalDaysToToday / bucketDays));

      const counts = await aggregateMessagesByBucket({
        rangeStart,
        bucketDays,
        bucketCount,
        facultyId: scopedFacultyId,
      });

      return counts.map((visits, i) => {
        const bucketStart = new Date(rangeStart);
        bucketStart.setDate(bucketStart.getDate() + i * bucketDays);
        const label =
          bucketDays === 1
            ? bucketStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : bucketStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return { day: label, visits };
      });
    }, []),
  ]);

  const pendingSubmissions = Math.max(
    0,
    submissionsByCourse.reduce((s, c) => s + c.missing, 0)
  );

  const coursePerformance = submissionsByCourse.map((c) => ({
    course: c.course,
    name: c.name,
    enrollments: c.onTime + c.late + c.missing,
    completions: c.onTime + c.late,
    dropouts: c.missing,
  }));

  const assignmentAnalytics = {
    submitted: totalSubmissions,
    pending: pendingSubmissions,
    late: lateSubmissions,
  };

  const quizPerformance = {
    averageScore: avgScore,
    passRate: quizPassRate,
    failRate: allQuizAttempts.length > 0 ? 100 - quizPassRate : 0,
    passed: passedQuizzes,
    failed: allQuizAttempts.length - passedQuizzes,
    total: allQuizAttempts.length,
  };

  const departmentPerformance = userSegment.rows.map((d) => {
    const match = courseCompletion.find((c) => c.name.includes(d.name)) ?? null;
    return {
      name: d.name,
      students: d.users,
      completionRate: match?.completion ?? avgScore,
    };
  });

  const prevMonthUsers = userGrowth.length >= 2 ? userGrowth[userGrowth.length - 2].users : 0;
  const currMonthUsers = userGrowth.length >= 1 ? userGrowth[userGrowth.length - 1].users : 0;
  const userGrowthTrend =
    prevMonthUsers === 0
      ? currMonthUsers > 0
        ? 100
        : 0
      : Math.round(((currMonthUsers - prevMonthUsers) / prevMonthUsers) * 100);


  return {
    ...ctx,
    recentUsers,
    recentSubs,
    recentQuizAttempts,
    dailyMessages,
    totalUsers,
    lateSubmissions,
    activeUsersThisMonth,
    pendingSubmissions,
    coursePerformance,
    assignmentAnalytics,
    quizPerformance,
    departmentPerformance,
    userGrowthTrend,
  };
}
