import { prisma } from "../../../db/prisma.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertFacultyCourse, getFacultyDepartmentIds } from "./helpers.js";

export const createCourse = async (req, res) => {
  try {
    const { facultyId } = req;
    const { name, code, description, credits, departmentId, semesterNumber } = req.body;

    if (!name || !code || !departmentId) {
      return res.status(400).json({ message: "name, code, and departmentId are required." });
    }

    const deptIds = await getFacultyDepartmentIds(facultyId);
    if (!deptIds.includes(Number(departmentId))) {
      return res.status(403).json({ message: "Department does not belong to your faculty." });
    }

    let semester = null;
    if (semesterNumber !== undefined && semesterNumber !== null && semesterNumber !== "") {
      const n = Number(semesterNumber);
      if (!Number.isFinite(n) || n < 1 || n > 12) {
        return res.status(400).json({ message: "semesterNumber must be between 1 and 12." });
      }
      semester = Math.trunc(n);
    }

    const course = await prisma.course.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description ?? null,
        credits: Number(credits) || 3,
        semesterNumber: semester,
        departmentId: Number(departmentId),
      },
      include: {
        department: { select: { name: true, code: true } },
      },
    });

    res.status(201).json({ message: "Course created successfully", course });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ message: "A course with this code already exists." });
    }
    respondInternalError(res, "Failed to create course", e);
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;
    const { name, code, description, credits, semesterNumber } = req.body;

    const existing = await assertFacultyCourse(id, facultyId, res);
    if (!existing) return;

    const data = {
      ...(name && { name }),
      ...(code && { code: code.toUpperCase() }),
      ...(description !== undefined && { description }),
      ...(credits && { credits: Number(credits) }),
    };

    if (semesterNumber !== undefined) {
      if (semesterNumber === null || semesterNumber === "") {
        data.semesterNumber = null;
      } else {
        const n = Number(semesterNumber);
        if (!Number.isFinite(n) || n < 1 || n > 12) {
          return res.status(400).json({ message: "semesterNumber must be between 1 and 12." });
        }
        data.semesterNumber = Math.trunc(n);
      }
    }

    const updated = await prisma.course.update({
      where: { id: Number(id) },
      data,
      include: { department: { select: { name: true, code: true } } },
    });

    res.json({ message: "Course updated", course: updated });
  } catch (e) {
    respondInternalError(res, "Failed to update course", e);
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertFacultyCourse(id, facultyId, res);
    if (!existing) return;

    const offeringCount = await prisma.courseOffering.count({ where: { courseId: Number(id) } });
    if (offeringCount > 0) {
      return res.status(409).json({
        message: `Cannot delete — this course has ${offeringCount} active offering(s). Remove them first.`,
      });
    }

    await prisma.$transaction([
      prisma.teacherAssigning.deleteMany({ where: { courseId: Number(id) } }),
      prisma.course.delete({ where: { id: Number(id) } }),
    ]);

    res.json({ message: "Course deleted successfully." });
  } catch (e) {
    respondInternalError(res, "Failed to delete course", e);
  }
};
