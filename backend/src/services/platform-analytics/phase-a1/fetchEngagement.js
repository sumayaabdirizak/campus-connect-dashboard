import { prisma } from '../../../db/prisma.js';
import {
  safe,
  studentWhere,
  messageSenderFacultyWhere,
} from '../analytics-helpers.js';

export async function fetchEngagementMetrics({ scopedFacultyId, offeringIds }) {
  const [
    activeStudents,
    totalSubmissions,
    onTimeSubmissions,
    allQuizAttempts,
    totalResourceViews,
    gradedSubmissions,
    messagesCount,
  ] = await Promise.all([
    safe(() => prisma.studentProfile.count({ where: studentWhere(scopedFacultyId) }), 0),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.count({ where: { assignment: { courseOfferingId: { in: offeringIds } } } })
          : 0,
      0
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: offeringIds } }, lateState: 'ON_TIME' },
            })
          : 0,
      0
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.quizAttempt.findMany({
              where: { quiz: { courseOfferingId: { in: offeringIds } } },
              select: { score: true, quiz: { select: { passing_score: true } } },
            })
          : [],
      []
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.resourceView.count({
              where: { resource: { courseOfferingId: { in: offeringIds } } },
            })
          : 0,
      0
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
                select: { gradeRow: { select: { score: true } } },
              })
              .then((rows) => rows.map((s) => ({ grade: s.gradeRow?.score ?? null })))
          : [],
      []
    ),
    safe(
      () =>
        scopedFacultyId
          ? prisma.discussionMessage.count({
              where: { deletedAt: null, ...messageSenderFacultyWhere(scopedFacultyId) },
            })
          : prisma.discussionMessage.count({ where: { deletedAt: null } }),
      0
    ),
  ]);

  return {
    activeStudents,
    totalSubmissions,
    onTimeSubmissions,
    allQuizAttempts,
    totalResourceViews,
    gradedSubmissions,
    messagesCount,
  };
}
