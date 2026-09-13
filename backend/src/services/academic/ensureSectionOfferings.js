import { prisma } from "../../db/prisma.js";

/**
 * Ensure course offerings exist for a section for the given term.
 * Prefers catalogue courses in the program department whose semesterNumber
 * matches the batch curriculum semester. Falls back to faculty-wide match,
 * then program-department courses with unset semesterNumber (legacy).
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

  const programDeptId = programDepartmentId ? Number(programDepartmentId) : null;

  async function findCourses(where) {
    return prisma.course.findMany({
      where: { ...where, teacherAssignings: { some: {} } },
      select: {
        id: true,
        teacherAssignings: teacherSelect,
      },
    });
  }

  let courses = [];
  if (programDeptId) {
    courses = await findCourses({
      departmentId: programDeptId,
      semesterNumber: sem,
    });
  }
  if (courses.length === 0) {
    courses = await findCourses({
      departmentId: { in: departmentIds },
      semesterNumber: sem,
    });
  }
  if (courses.length === 0 && programDeptId) {
    courses = await findCourses({
      departmentId: programDeptId,
      semesterNumber: null,
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
