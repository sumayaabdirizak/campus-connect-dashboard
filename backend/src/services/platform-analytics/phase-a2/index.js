import { computeQuizStats, buildGradeDistribution } from './quizStats.js';
import { computeAnnouncementReach } from './announcementReach.js';
import { buildSubmissionsByCourse, buildCourseCompletion } from './courseCharts.js';
import { buildTrendSeries } from './trends.js';
import { buildAudienceCharts } from './audience.js';

export async function runAnalyticsPhaseA2(ctx) {
  const quizStats = computeQuizStats(ctx.allQuizAttempts);
  const announcement = await computeAnnouncementReach(ctx);
  const [submissionsByCourse, courseCompletion] = await Promise.all([
    buildSubmissionsByCourse(ctx.uniqueCourses, ctx.offerings),
    buildCourseCompletion(ctx.uniqueCourses, ctx.offerings),
  ]);
  const gradeDistribution = buildGradeDistribution(ctx.gradedSubmissions);
  const trends = await buildTrendSeries(ctx);
  const audience = await buildAudienceCharts({ ...ctx, submissionsByCourse });

  return {
    ...ctx,
    ...quizStats,
    ...announcement,
    submissionsByCourse,
    gradeDistribution,
    courseCompletion,
    ...trends,
    ...audience,
  };
}
