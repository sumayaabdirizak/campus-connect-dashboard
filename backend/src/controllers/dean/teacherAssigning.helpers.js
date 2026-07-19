/**
 * Shared query helpers for dean-scoped teacher and offering verification.
 */
import { prisma } from '../../db/prisma.js';

/** Get all program IDs belonging to a faculty (via departments). */
export const getFacultyProgramIds = async (facultyId) => {
  const departments = await prisma.department.findMany({
    where: { facultyId },
    select: { programs: { select: { id: true } } },
  });
  return departments.flatMap((d) => d.programs.map((p) => p.id));
};

/**
 * Verify a teacher is affiliated with the dean's faculty.
 * Returns the teacher record or sends a 403 and returns null.
 */
export const assertFacultyTeacher = async (teacherId, facultyId, res) => {
  const teacher = await prisma.user.findFirst({
    where: {
      id: Number(teacherId),
      lecturerProfile: { faculties: { some: { facultyId } } },
    },
    include: {
      role: { select: { name: true } },
      lecturerProfile: {
        include: { faculties: { include: { faculty: true } } },
      },
    },
  });
  if (!teacher) {
    res.status(403).json({ message: 'Teacher is not affiliated with your faculty.' });
    return null;
  }
  return teacher;
};

/**
 * Verify a course offering belongs to the dean's faculty.
 * Returns the offering record or sends a 403 and returns null.
 */
export const assertFacultyOffering = async (offeringId, facultyId, res) => {
  const deptIds = await prisma.department
    .findMany({ where: { facultyId }, select: { id: true } })
    .then((depts) => depts.map((d) => d.id));

  const offering = await prisma.courseOffering.findFirst({
    where: {
      id: Number(offeringId),
      course: { departmentId: { in: deptIds } },
    },
    include: { course: true, section: true },
  });
  if (!offering) {
    res.status(403).json({ message: 'Offering not found in your faculty.' });
    return null;
  }
  return offering;
};
