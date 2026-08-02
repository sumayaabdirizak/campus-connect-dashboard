import { lastSixMonths } from "./helpers.js";
import { computeFacultyKpis } from "./kpis.js";
import { computeFacultyCharts } from "./charts.js";

export async function getDeanAnalytics(req, res, next) {
  try {
    const facultyId = Number(req.facultyId);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const months = lastSixMonths();

    const { offerings, offeringIds, uniqueCourses, allQuizAttempts, gradedSubmissions, kpis } =
      await computeFacultyKpis(facultyId);

    const charts = await computeFacultyCharts({
      facultyId,
      offerings,
      offeringIds,
      uniqueCourses,
      allQuizAttempts,
      gradedSubmissions,
      sixMonthsAgo,
      months,
    });

    res.json({ kpis, charts });
  } catch (e) {
    next(e);
  }
}
