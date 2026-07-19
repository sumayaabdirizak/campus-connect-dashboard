import { DAY_LABELS, toDayKey, toMonthKey } from './helpers.js';

export function buildAttendanceCharts({ recentSubmissions, months, departmentPerformance }) {
  const dailyAttendance = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = toDayKey(d);
    const daySubs = recentSubmissions.filter((s) => toDayKey(s.submitted_at) === key);
    const onTime = daySubs.filter((s) => !s.is_late).length;
    const total = daySubs.length || 1;
    return {
      day: DAY_LABELS[d.getDay()],
      rate: Math.round((onTime / total) * 100),
    };
  });

  const monthlyAttendance = months.map(({ label, key }) => {
    const subs = recentSubmissions.filter((s) => toMonthKey(s.submitted_at) === key);
    const onTime = subs.filter((s) => !s.is_late).length;
    const total = subs.length || 1;
    return { month: label, rate: Math.round((onTime / total) * 100) };
  });

  const departmentAttendance = departmentPerformance.slice(0, 6).map((d) => ({
    department: d.code,
    rate: Math.max(50, Math.min(100, d.passRate)),
  }));

  return { dailyAttendance, monthlyAttendance, departmentAttendance };
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
