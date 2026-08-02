export function buildRiskSections({
  studentReports,
  bottomCourses,
  rankedDepartments,
}) {
  const studentsAtRisk = studentReports
    .filter((s) => s.status === 'At Risk' || s.gpa < 2.0)
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      name: s.student,
      department: s.department,
      gpa: s.gpa,
      reason: 'Low GPA',
      priority: s.gpa < 1.5 ? 'high' : 'medium',
    }));

  const coursesAtRisk = bottomCourses
    .filter((c) => c.avgScore < 65 || c.completion < 50)
    .slice(0, 6)
    .map((c) => ({
      course: c.course,
      name: c.name,
      failureRate: Math.max(0, 100 - c.avgScore),
      completion: c.completion,
      engagement: c.engagement,
      priority: c.avgScore < 50 ? 'high' : 'medium',
    }));

  const departmentsAtRisk = rankedDepartments
    .filter((d) => d.gpa < 2.5 || d.passRate < 60)
    .slice(0, 5)
    .map((d) => ({
      department: d.department,
      gpa: d.gpa,
      passRate: d.passRate,
      trend: d.gpa < 2 ? 'declining' : 'stable',
      priority: d.gpa < 2 ? 'high' : 'medium',
    }));

  return { studentsAtRisk, coursesAtRisk, departmentsAtRisk };
}
