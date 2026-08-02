import { DAY_LABELS, toDayKey, toMonthKey } from './helpers.js';

// Wire format keeps the `attendance`/`attendanceRate` field names for API
// compatibility with existing frontend consumers, but this is submission
// timeliness (on-time vs late), not formal attendance — the real Attendance
// feature was removed from the app. See the "Platform engagement — activity,
// not formal attendance" disclaimer in faculty-reports-usage-tab.tsx.
export function buildEngagementCharts({ recentSubmissions, months, offerings }) {
  const dailyEngagement = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = toDayKey(d);
    const daySubs = recentSubmissions.filter((s) => toDayKey(s.submitted_at) === key);
    const onTime = daySubs.filter((s) => s.lateState !== 'LATE').length;
    const total = daySubs.length || 1;
    return {
      day: DAY_LABELS[d.getDay()],
      rate: Math.round((onTime / total) * 100),
    };
  });

  const monthlyEngagement = months.map(({ label, key }) => {
    const subs = recentSubmissions.filter((s) => toMonthKey(s.submitted_at) === key);
    const onTime = subs.filter((s) => s.lateState !== 'LATE').length;
    const total = subs.length || 1;
    return { month: label, rate: Math.round((onTime / total) * 100) };
  });

  // Same on-time/late formula as daily/monthly, grouped by department via
  // offering -> course -> department, instead of reusing passRate (a
  // different metric that was previously mislabeled as attendance).
  const offeringDepartment = new Map(
    offerings.map((o) => [o.id, o.course?.department ?? null])
  );
  const byDept = new Map();
  for (const s of recentSubmissions) {
    const dept = offeringDepartment.get(s.courseOfferingId);
    if (!dept) continue;
    const bucket = byDept.get(dept.id) ?? { code: dept.code, onTime: 0, total: 0 };
    bucket.total += 1;
    if (s.lateState !== 'LATE') bucket.onTime += 1;
    byDept.set(dept.id, bucket);
  }
  const departmentEngagement = Array.from(byDept.values())
    .slice(0, 6)
    .map((d) => ({
      department: d.code,
      rate: Math.round((d.onTime / (d.total || 1)) * 100),
    }));

  return { dailyEngagement, monthlyEngagement, departmentEngagement };
}

export function buildInstructorPerformanceChart(instructorReports) {
  return instructorReports
    .slice(0, 8)
    .map((i) => ({
      name: i.instructor.split(' ')[0] ?? i.instructor,
      feedback: i.rating,
      completion: i.completion,
      engagement: Math.min(100, i.completion + 10),
      turnaround: Math.max(1, Math.round(5 - i.rating)),
    }));
}
