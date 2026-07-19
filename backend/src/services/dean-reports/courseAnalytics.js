export async function buildCourseAnalytics({
  uniqueCourses,
  offerings,
  allQuizAttempts,
  gradedSubmissions,
  courseAccessRows,
}) {
  const offeringByCourse = new Map();
  for (const o of offerings) {
    if (!offeringByCourse.has(o.courseId)) offeringByCourse.set(o.courseId, []);
    offeringByCourse.get(o.courseId).push(o.id);
  }

  const courseStats = await Promise.all(
    uniqueCourses.map(async (course) => {
      const ids = offeringByCourse.get(course.id) ?? [];
      const enrolled = offerings
        .filter((o) => o.courseId === course.id)
        .reduce((s, o) => s + (o.section?._count?.studentRegistrations ?? 0), 0);
      const attempts = allQuizAttempts.filter((a) =>
        ids.includes(a.quiz?.courseOfferingId)
      );
      const grades = gradedSubmissions.filter((g) =>
        ids.includes(g.assignment?.courseOfferingId)
      );
      const avgScore =
        attempts.length > 0
          ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length)
          : grades.length > 0
            ? Math.round(grades.reduce((s, g) => s + (g.grade ?? 0), 0) / grades.length)
            : 0;
      const completion =
        enrolled > 0 ? Math.min(100, Math.round((attempts.length / enrolled) * 100)) : 0;
      const engagement = Math.min(
        100,
        Math.round((courseAccessRows.filter((c) => ids.includes(c.courseOfferingId)).length / Math.max(enrolled, 1)) * 100)
      );
      return {
        course: course.code,
        name: course.name,
        department: course.department?.name ?? '—',
        avgScore,
        completion,
        engagement,
        enrolled,
      };
    })
  );

  const sortedCourses = [...courseStats].sort((a, b) => b.avgScore - a.avgScore);
  const topCourses = sortedCourses.slice(0, 5);
  const bottomCourses = [...sortedCourses].sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

  const courseReports = courseStats.map((c) => ({
    course: c.course,
    name: c.name,
    department: c.department,
    students: c.enrolled,
    completion: c.completion,
    avgScore: c.avgScore,
  }));

  return { courseStats, topCourses, bottomCourses, courseReports };
}
