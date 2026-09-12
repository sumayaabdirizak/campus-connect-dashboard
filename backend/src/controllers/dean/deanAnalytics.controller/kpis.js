import { prisma } from "../../../db/prisma.js";
import { safe } from "./helpers.js";

/**
 * Computes faculty-wide KPI figures, plus the offering/course/quiz/grade
 * data sets that {@link computeFacultyCharts} needs to avoid re-querying.
 */
export async function computeFacultyKpis(facultyId) {
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
      ? prisma.submission.count({ where: { assignment: { courseOfferingId: { in: offeringIds } }, lateState: 'ON_TIME' } })
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
          where: {
            assignment: { courseOfferingId: { in: offeringIds } },
            gradeRow: { is: { score: { not: null } } },
          },
          select: { gradeRow: { select: { score: true } } },
        }).then((rows) => rows.map((s) => ({ grade: s.gradeRow?.score ?? null })))
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

  return {
    offerings,
    offeringIds,
    uniqueCourses,
    allQuizAttempts,
    gradedSubmissions,
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
  };
}
