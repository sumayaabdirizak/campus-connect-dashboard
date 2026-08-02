import { prisma } from '../../../db/prisma.js';
import { safe } from '../analytics-helpers.js';

export async function buildSubmissionsByCourse(uniqueCourses, offerings) {
  return Promise.all(
    uniqueCourses.slice(0, 8).map(async (course) => {
      const ids = offerings.filter((o) => o.courseId === course.id).map((o) => o.id);
      if (!ids.length) return { course: course.code, name: course.name, onTime: 0, late: 0, missing: 0 };
      const [onTime, late, totalStudents] = await Promise.all([
        safe(
          () =>
            prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: ids } }, lateState: 'ON_TIME' },
            }),
          0
        ),
        safe(
          () =>
            prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: ids } }, lateState: 'LATE' },
            }),
          0
        ),
        safe(
          () =>
            prisma.studentRegistration.count({
              where: { section: { offerings: { some: { id: { in: ids } } } } },
            }),
          0
        ),
      ]);
      const submitted = onTime + late;
      const missing = Math.max(0, totalStudents - submitted);
      return { course: course.code, name: course.name, onTime, late, missing };
    })
  );
}

export async function buildCourseCompletion(uniqueCourses, offerings) {
  return Promise.all(
    uniqueCourses.slice(0, 8).map(async (course) => {
      const ids = offerings.filter((o) => o.courseId === course.id).map((o) => o.id);
      if (!ids.length) return { course: course.code, name: course.name, completion: 0 };
      const attempts = await safe(
        () =>
          prisma.quizAttempt.findMany({
            where: { quiz: { courseOfferingId: { in: ids } } },
            select: { score: true },
          }),
        []
      );
      const completion =
        attempts.length > 0
          ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length)
          : 0;
      return { course: course.code, name: course.name, completion };
    })
  );
}
