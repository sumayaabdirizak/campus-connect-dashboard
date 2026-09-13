import { prisma } from "../../db/prisma.js";
import { resolveActiveAcademicTerm } from "./resolveActiveAcademicTerm.js";

/**
 * Ensure CourseOfferings exist for a teacher's assigned catalogue courses.
 * Creates one offering per ACTIVE registration section/term in the course
 * department (semester match, or null semesterNumber fallback).
 */
export async function ensureTeacherOfferings(teacherId) {
  const tid = Number(teacherId);
  if (!Number.isFinite(tid) || tid < 1) return { created: 0 };

  const assignings = await prisma.teacherAssigning.findMany({
    where: { teacherId: tid },
    select: {
      courseId: true,
      course: {
        select: {
          id: true,
          departmentId: true,
          semesterNumber: true,
        },
      },
    },
  });

  if (assignings.length === 0) return { created: 0 };

  const departmentIds = [
    ...new Set(assignings.map((a) => a.course.departmentId).filter(Boolean)),
  ];
  if (departmentIds.length === 0) return { created: 0 };

  const activeTerm = await resolveActiveAcademicTerm({ includeDb: false });
  const currentYearName = activeTerm.academicYearName;

  let regs = await prisma.studentRegistration.findMany({
    where: {
      status: "ACTIVE",
      currentAcademicYear: { name: currentYearName },
      batchSection: {
        batch: { program: { departmentId: { in: departmentIds } } },
      },
    },
    select: {
      batchSectionId: true,
      currentAcademicYearId: true,
      currentSemesterId: true,
      batchSection: {
        select: {
          batch: {
            select: {
              semester_number: true,
              program: { select: { departmentId: true } },
            },
          },
        },
      },
    },
  });

  if (regs.length === 0) {
    regs = await prisma.studentRegistration.findMany({
      where: {
        status: "ACTIVE",
        batchSection: {
          batch: { program: { departmentId: { in: departmentIds } } },
        },
      },
      select: {
        batchSectionId: true,
        currentAcademicYearId: true,
        currentSemesterId: true,
        batchSection: {
          select: {
            batch: {
              select: {
                semester_number: true,
                program: { select: { departmentId: true } },
              },
            },
          },
        },
      },
      take: 200,
    });
  }

  if (regs.length === 0) return { created: 0 };

  const slots = new Map();
  for (const r of regs) {
    if (!r.currentAcademicYearId || !r.currentSemesterId) continue;
    const key = `${r.batchSectionId}:${r.currentAcademicYearId}:${r.currentSemesterId}`;
    if (!slots.has(key)) {
      slots.set(key, {
        sectionId: r.batchSectionId,
        academicYearId: r.currentAcademicYearId,
        semesterId: r.currentSemesterId,
        curriculumSemester: r.batchSection.batch.semester_number,
        departmentId: r.batchSection.batch.program.departmentId,
      });
    }
  }

  let created = 0;
  for (const a of assignings) {
    const course = a.course;
    for (const slot of slots.values()) {
      if (slot.departmentId !== course.departmentId) continue;
      const courseSem = course.semesterNumber;
      if (
        courseSem != null &&
        Number(courseSem) !== Number(slot.curriculumSemester)
      ) {
        continue;
      }

      try {
        await prisma.courseOffering.create({
          data: {
            courseId: course.id,
            sectionId: slot.sectionId,
            academicYearId: slot.academicYearId,
            semesterId: slot.semesterId,
            teacherId: tid,
          },
        });
        created += 1;
      } catch (e) {
        if (e.code !== "P2002") throw e;
        await prisma.courseOffering.updateMany({
          where: {
            courseId: course.id,
            sectionId: slot.sectionId,
            academicYearId: slot.academicYearId,
            semesterId: slot.semesterId,
            teacherId: null,
          },
          data: { teacherId: tid },
        });
      }
    }
  }

  return { created };
}
