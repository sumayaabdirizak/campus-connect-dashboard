export function buildInsights({
  rankedDepartments,
  enrollmentTrend,
  attendanceRate,
  studentsAtRisk,
  coursesAtRisk,
}) {
  const insights = [];
  const topDept = rankedDepartments[0];
  if (topDept) {
    insights.push(
      `${topDept.department} leads faculty performance with a ${topDept.gpa.toFixed(1)} GPA.`
    );
  }
  if (enrollmentTrend > 0) {
    insights.push(`New enrollments increased ${enrollmentTrend}% compared to the prior period.`);
  } else if (enrollmentTrend < 0) {
    insights.push(`Enrollment declined ${Math.abs(enrollmentTrend)}% — review outreach programs.`);
  }
  if (attendanceRate < 75) {
    insights.push('Faculty-wide attendance is below target — consider engagement initiatives.');
  }
  if (studentsAtRisk.length > 0) {
    insights.push(
      `${studentsAtRisk.length} students flagged at risk — prioritize academic advising.`
    );
  }
  if (coursesAtRisk.length > 0) {
    insights.push(`${coursesAtRisk.length} courses show low performance metrics.`);
  }
  return insights;
}

export function buildRecentActivity({ faculty, studentsAtRisk, coursesAtRisk }) {
  const activities = [
    {
      id: '1',
      type: 'report',
      title: 'Faculty analytics refreshed',
      description: `Snapshot for ${faculty?.name ?? 'faculty'} generated.`,
      timestamp: new Date().toISOString(),
    },
    ...studentsAtRisk.slice(0, 2).map((s, i) => ({
      id: `risk-${i}`,
      type: 'alert',
      title: 'Student at risk',
      description: `${s.name} (${s.department}) — ${s.reason}`,
      timestamp: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    })),
    ...coursesAtRisk.slice(0, 1).map((c, i) => ({
      id: `course-${i}`,
      type: 'alert',
      title: 'Course performance alert',
      description: `${c.course} shows ${c.failureRate}% failure indicators.`,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    })),
  ];

  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
