import { prisma } from '../../db/prisma.js';
import { safe } from './helpers.js';

export async function fetchAcademicCollections({ offeringIds, since }) {
  const [allQuizAttempts, gradedSubmissions, courseAccessRows, recentSubmissions] =
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
            ? prisma.submission.findMany({
                where: {
                  assignment: { courseOfferingId: { in: offeringIds } },
                  grade: { not: null },
                },
                select: {
                  grade: true,
                  studentId: true,
                  submitted_at: true,
                  assignment: {
                    select: { courseOfferingId: true },
                  },
                },
              })
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
            ? prisma.submission.findMany({
                where: {
                  assignment: { courseOfferingId: { in: offeringIds } },
                  submitted_at: { gte: since },
                },
                select: { submitted_at: true, is_late: true },
              })
            : [],
        []
      ),
    ]);

  return { allQuizAttempts, gradedSubmissions, courseAccessRows, recentSubmissions };
}
