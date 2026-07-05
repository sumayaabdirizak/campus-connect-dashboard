import { prisma } from '../../db/prisma.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function lastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: MONTHS[d.getMonth()], key: `${d.getFullYear()}-${d.getMonth()}` };
  });
}

function toMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

async function safe(fn, fallback) {
  try { return await fn(); } catch { return fallback; }
}

export async function getDeanAnalytics(req, res, next) {
  try {
    const facultyId = Number(req.facultyId);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const months = lastSixMonths();

    // ── 1. All offerings in this faculty ────────────────────────────────────
    const offerings = await prisma.courseOffering.findMany({
      where: {
        section: { batch: { program: { department: { facultyId } } } }
      },
      select: {
        id: true,
        courseId: true,
        course: { select: { id: true, code: true, name: true } }
      }
    });
    const offeringIds = offerings.map(o => o.id);

    // Deduplicated courses
    const seenIds = new Set();
    const uniqueCourses = [];
    for (const o of offerings) {
      if (!seenIds.has(o.courseId)) {
        seenIds.add(o.courseId);
        uniqueCourses.push(o.course);
      }
    }

    // ── 2. KPI queries in parallel ───────────────────────────────────────────
    const [
      activeStudents,
      totalSubmissions,
      onTimeSubmissions,
      allQuizAttempts,
      totalResourceViews,
      gradedSubmissions,
      facultyAnnouncements,
    ] = await Promise.all([
      // Count students in this faculty
      safe(() => prisma.studentProfile.count({ where: { facultyId } }), 0),

      // All submissions in faculty offerings
      safe(() => offeringIds.length
        ? prisma.submission.count({ where: { assignment: { courseOfferingId: { in: offeringIds } } } })
        : 0, 0),

      // On-time submissions
      safe(() => offeringIds.length
        ? prisma.submission.count({ where: { assignment: { courseOfferingId: { in: offeringIds } }, is_late: false } })
        : 0, 0),

      // All quiz attempts with score info
      safe(() => offeringIds.length
        ? prisma.quizAttempt.findMany({
            where: { quiz: { courseOfferingId: { in: offeringIds } } },
            select: { score: true, quiz: { select: { passing_score: true } } }
          })
        : [], []),

      // Resource views for faculty offerings (courseOfferingId is nullable, so filter by not-null)
      safe(() => offeringIds.length
        ? prisma.resourceView.count({
            where: { resource: { courseOfferingId: { in: offeringIds } } }
          })
        : 0, 0),

      // Graded submissions
      safe(() => offeringIds.length
        ? prisma.submission.findMany({
            where: { assignment: { courseOfferingId: { in: offeringIds } }, grade: { not: null } },
            select: { grade: true }
          })
        : [], []),

      // Announcements targeting this faculty via scopeType=FACULTY, scopeId=facultyId
      safe(() => prisma.announcement.findMany({
        where: {
          targets: { some: { scopeType: 'FACULTY', scopeId: facultyId } }
        },
        select: { id: true }
      }), []),
    ]);

    // Messages from faculty students
    const messagesCount = await safe(() =>
      prisma.discussionMessage.count({
        where: {
          deletedAt: null,
          sender: { studentProfile: { facultyId } }
        }
      }), 0);

    // Quiz stats
    const passedQuizzes = allQuizAttempts.filter(
      a => a.score !== null && a.score >= (a.quiz?.passing_score ?? 50)
    ).length;
    const quizPassRate = allQuizAttempts.length > 0
      ? Math.round(passedQuizzes / allQuizAttempts.length * 100)
      : 0;
    const avgScore = allQuizAttempts.length > 0
      ? Math.round(allQuizAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / allQuizAttempts.length)
      : 0;

    // Announcement reach
    const announcementIds = facultyAnnouncements.map(a => a.id);
    const uniqueReaders = await safe(async () => {
      if (!announcementIds.length) return [];
      return prisma.announcementRead.groupBy({
        by: ['userId'],
        where: { announcementId: { in: announcementIds } }
      });
    }, []);
    const announcementReach = activeStudents > 0
      ? Math.round(Math.min(uniqueReaders.length, activeStudents) / activeStudents * 100)
      : 0;

    // ── 3. Submissions by course ─────────────────────────────────────────────
    const submissionsByCourse = await Promise.all(
      uniqueCourses.slice(0, 6).map(async (course) => {
        const ids = offerings.filter(o => o.courseId === course.id).map(o => o.id);
        if (!ids.length) return { course: course.code, onTime: 0, late: 0 };
        const [onTime, late] = await Promise.all([
          safe(() => prisma.submission.count({ where: { assignment: { courseOfferingId: { in: ids } }, is_late: false } }), 0),
          safe(() => prisma.submission.count({ where: { assignment: { courseOfferingId: { in: ids } }, is_late: true } }), 0),
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
              submitted_at: { gte: sixMonthsAgo }
            },
            select: { submitted_at: true, grade: true }
          })
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

    res.json({
      kpis: {
        activeUsers: activeStudents,
        messagesExchanged: messagesCount,
        assignmentsSubmitted: totalSubmissions,
        avgCourseCompletion: avgScore,
        announcementReach,
        onTimeSubmissions: totalSubmissions > 0
          ? Math.round(onTimeSubmissions / totalSubmissions * 100)
          : 0,
        quizPassRate,
        resourceViews: totalResourceViews,
      },
      charts: {
        communicationActivity,
        learningProgress,
        submissionsByCourse,
        quizScoreDistribution,
        gradeDistribution,
        courseCompletion,
      }
    });
  } catch (e) {
    next(e);
  }
}
