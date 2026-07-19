import { gradeToGpa } from './helpers.js';

export async function buildDepartmentAnalytics({
  departments,
  offerings,
  uniqueCourses,
  gradedSubmissions,
  allQuizAttempts,
  studentProfiles,
  teachers,
}) {
  const departmentPerformance = await Promise.all(
    departments.map(async (dept) => {
      const deptOfferingIds = offerings
        .filter((o) => o.course.departmentId === dept.id)
        .map((o) => o.id);
      const deptGrades = gradedSubmissions.filter((g) =>
        deptOfferingIds.includes(g.assignment?.courseOfferingId)
      );
      const deptAttempts = allQuizAttempts.filter((a) =>
        deptOfferingIds.includes(a.quiz?.courseOfferingId)
      );
      const gpa =
        deptGrades.length > 0
          ? Math.round(
              (deptGrades.reduce((s, g) => s + gradeToGpa(g.grade), 0) / deptGrades.length) * 100
            ) / 100
          : 0;
      const passRate =
        deptAttempts.length > 0
          ? Math.round(
              (deptAttempts.filter(
                (a) => a.score !== null && a.score >= (a.quiz?.passing_score ?? 50)
              ).length /
                deptAttempts.length) *
                100
            )
          : 0;
      const completionRate =
        deptAttempts.length > 0 && deptOfferingIds.length > 0
          ? Math.min(100, Math.round((deptAttempts.length / (deptOfferingIds.length * 10)) * 100))
          : passRate;
      const studentCount = studentProfiles.filter((s) => s.departmentId === dept.id).length;
      const instructorCount = teachers.filter(
        (t) => t.lecturerProfile?.department?.id === dept.id
      ).length;
      const courseCount = uniqueCourses.filter((c) => c.departmentId === dept.id).length;
      return {
        department: dept.name,
        code: dept.code,
        gpa,
        passRate,
        completionRate,
        students: studentCount,
        instructors: instructorCount,
        courses: courseCount,
      };
    })
  );

  const rankedDepartments = [...departmentPerformance].sort((a, b) => b.gpa - a.gpa);

  return { departmentPerformance, rankedDepartments };
}
