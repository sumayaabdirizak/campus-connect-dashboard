import { prisma } from "../../db/prisma.js";

/**
 * Ensure course offerings exist for a section for the given term.
 * Prefers catalogue courses whose semesterNumber matches the batch curriculum
 * semester (and have teachers). If none match, falls back to courses in the
 * program department with unset semesterNumber (legacy catalogue).
 */
export async function ensureSectionOfferings({
  sectionId,
  academicYearId,
  semesterId,
  curriculumSemester,
  departmentIds,
  programDepartmentId,
}) {
  const sem = Number(curriculumSemester);
  if (
    !sectionId ||
    !academicYearId ||
    !semesterId ||
    !Number.isFinite(sem) ||
    sem < 1 ||
    !departmentIds?.length
  ) {
    return { created: 0 };
  }

  const teacherSelect = {
    select: { teacherId: true },
    take: 1,
    orderBy: { assigned_at: "asc" },
  };

  let courses = await prisma.course.findMany({
    where: {
      departmentId: { in: departmentIds },
      semesterNumber: sem,
      teacherAssignings: { some: {} },
    },
    select: {
      id: true,
      teacherAssignings: teacherSelect,
    },
  });

  if (courses.length === 0) {
    const fallbackDeptIds = programDepartmentId
      ? [Number(programDepartmentId)]
      : departmentIds;
    courses = await prisma.course.findMany({
      where: {
        departmentId: { in: fallbackDeptIds },
        semesterNumber: null,
        teacherAssignings: { some: {} },
      },
      select: {
        id: true,
        teacherAssignings: teacherSelect,
      },
    });
  }

  let created = 0;
  for (const course of courses) {
    try {
      await prisma.courseOffering.create({
        data: {
          courseId: course.id,
          sectionId: Number(sectionId),
          academicYearId: Number(academicYearId),
          semesterId: Number(semesterId),
          teacherId: course.teacherAssignings[0]?.teacherId ?? null,
        },
      });
      created += 1;
    } catch (e) {
      if (e.code !== "P2002") throw e;
    }
  }

  return { created };
}
