import { prisma } from '../../../db/prisma.js';
import { safe, toMonthKey } from '../analytics-helpers.js';
import { aggregateMessagesByMonth } from '../helpers/aggregations.js';

export async function buildTrendSeries({
  scopedFacultyId,
  since,
  months,
  offeringIds,
  userByMonth,
}) {
  const [msgByMonth, recentSubmDates] = await Promise.all([
    aggregateMessagesByMonth(since, scopedFacultyId),
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
                  gradeRow: { select: { score: true } },
                },
              })
              .then((rows) =>
                rows.map((s) => ({
                  submitted_at: s.submitted_at,
                  grade: s.gradeRow?.score ?? null,
                }))
              )
          : [],
      []
    ),
  ]);

  const gradeByMonth = {};
  for (const s of recentSubmDates) {
    const k = toMonthKey(s.submitted_at);
    if (!gradeByMonth[k]) gradeByMonth[k] = [];
    gradeByMonth[k].push(s.grade ?? 0);
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

  return { communicationActivity, learningProgress, userGrowth };
}
