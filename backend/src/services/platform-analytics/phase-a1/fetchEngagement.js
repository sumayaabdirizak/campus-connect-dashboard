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
              where: { assignment: { courseOfferingId: { in: offeringIds } }, is_late: false },
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
          ? prisma.submission.findMany({
              where: { assignment: { courseOfferingId: { in: offeringIds } }, grade: { not: null } },
              select: { grade: true },
            })
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
