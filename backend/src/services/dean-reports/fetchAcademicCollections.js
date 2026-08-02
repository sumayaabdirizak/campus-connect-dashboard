import { prisma } from '../../db/prisma.js';
import { safe } from './helpers.js';

export async function fetchAcademicCollections({ offeringIds, since }) {
  const [allQuizAttempts, gradedSubmissions, courseAccessRows, recentSubmissions, resourceRows, resourceViews] =
    await Promise.all([
      safe(
        () =>
          offeringIds.length
            ? prisma.quizAttempt.findMany({
                where: { quiz: { courseOfferingId: { in: offeringIds } } },
                select: {
                  score: true,
                  created_at: true,
                  quiz: { select: { passing_score: true, courseOfferingId: true } },
                },
              })
            : [],
        []
      ),
      safe(
        () =>
          offeringIds.length
            ? prisma.submission
                .findMany({
                  where: {
                    assignment: { courseOfferingId: { in: offeringIds } },
                    gradeRow: { isNot: null, score: { not: null } },
                  },
                  select: {
                    studentId: true,
                    submitted_at: true,
                    gradeRow: { select: { score: true } },
                    assignment: {
                      select: { courseOfferingId: true },
                    },
                  },
                })
                .then((rows) =>
                  rows.map((s) => ({
                    grade: s.gradeRow?.score ?? null,
                    studentId: s.studentId,
                    submitted_at: s.submitted_at,
                    assignment: s.assignment,
                  })),
                )
            : [],
        []
      ),
      safe(
        () =>
          offeringIds.length
            ? prisma.courseOfferingAccess.findMany({
                where: { courseOfferingId: { in: offeringIds }, lastSeenAt: { gte: since } },
                select: { lastSeenAt: true, courseOfferingId: true },
              })
            : [],
        []
      ),
      safe(
        () =>
          offeringIds.length
            ? prisma.submission
                .findMany({
                  where: {
                    assignment: { courseOfferingId: { in: offeringIds } },
                    submitted_at: { gte: since },
                  },
                  select: {
                    submitted_at: true,
                    lateState: true,
                    assignment: { select: { courseOfferingId: true } },
                  },
                })
                .then((rows) =>
                  rows.map((s) => ({
                    submitted_at: s.submitted_at,
                    lateState: s.lateState,
                    courseOfferingId: s.assignment.courseOfferingId,
                  })),
                )
            : [],
        []
      ),
      safe(
        () =>
          offeringIds.length
            ? prisma.resource.findMany({
                where: {
                  courseOfferingId: { in: offeringIds },
                  is_draft: false,
                  status: { not: 'REJECTED' },
                },
                select: { id: true, courseOfferingId: true },
              })
            : [],
        []
      ),
      safe(
        () =>
          offeringIds.length
            ? prisma.resourceView.findMany({
                where: {
                  resource: { courseOfferingId: { in: offeringIds } },
                  updated_at: { gte: since },
                },
                select: {
                  studentId: true,
                  completed: true,
                  watchedSeconds: true,
                  durationSeconds: true,
                  viewCount: true,
                },
              })
            : [],
        []
      ),
    ]);

  return {
    allQuizAttempts,
    gradedSubmissions,
    courseAccessRows,
    recentSubmissions,
    resourceCount: resourceRows.length,
    resourceViews,
  };
}
