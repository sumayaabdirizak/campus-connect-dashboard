import { prisma } from '../../../db/prisma.js';
import { safe, messageSenderFacultyWhere, toMonthKey } from '../analytics-helpers.js';

export async function buildTrendSeries({
  scopedFacultyId,
  since,
  months,
  offeringIds,
  userGrowthRows,
}) {
  const messageScopeFilter = messageSenderFacultyWhere(scopedFacultyId);

  const [recentMsgDates, recentSubmDates] = await Promise.all([
    safe(
      () =>
        scopedFacultyId
          ? prisma.discussionMessage.findMany({
              where: {
                deletedAt: null,
                createdAt: { gte: since },
                ...messageScopeFilter,
              },
              select: { createdAt: true },
            })
          : prisma.discussionMessage.findMany({
              where: { deletedAt: null, createdAt: { gte: since } },
              select: { createdAt: true },
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
              select: { submitted_at: true, grade: true },
            })
          : [],
      []
    ),
  ]);

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

  const userByMonth = {};
  for (const u of userGrowthRows) {
    const k = toMonthKey(u.created_at);
    userByMonth[k] = (userByMonth[k] ?? 0) + 1;
  }

  const communicationActivity = months.map(({ label, key }) => ({
    month: label,
    messages: msgByMonth[key] ?? 0,
  }));

  const learningProgress = months.map(({ label, key }) => {
    const grades = gradeByMonth[key] ?? [];
    return {
      month: label,
      completion:
        grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length) : null,
    };
  });

  const userGrowth = months.map(({ label, key }) => ({
    month: label,
    users: userByMonth[key] ?? 0,
  }));

  return { messageScopeFilter, communicationActivity, learningProgress, userGrowth };
}
