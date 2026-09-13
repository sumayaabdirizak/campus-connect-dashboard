import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";

export const getFacultyDepartmentIds = async (facultyId) => {
  const depts = await prisma.department.findMany({
    where: { facultyId },
    select: { id: true },
  });
  return depts.map((d) => d.id);
};

export const assertFacultyCourse = async (courseId, facultyId, res) => {
  const deptIds = await getFacultyDepartmentIds(facultyId);
  const course = await prisma.course.findFirst({
    where: { id: Number(courseId), departmentId: { in: deptIds } },
  });
  if (!course) {
    res.status(403).json(apiErrorBody("Course does not belong to your faculty.", null));
    return null;
  }
  return course;
};
