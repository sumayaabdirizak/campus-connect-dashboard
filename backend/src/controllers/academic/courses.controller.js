import { prisma } from "../../db/prisma.js";
import { respondInternalError } from "../../utils/httpError.js";

export const getAllCourses = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = departmentId ? { departmentId: Number(departmentId) } : {};
    const courses = await prisma.course.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        teacherAssignings: {
          include: {
            teacher: { select: { id: true, full_name: true, email: true } },
          },
          orderBy: { assigned_at: "desc" },
        },
        _count: { select: { teacherAssignings: true } },
      },
      orderBy: { code: "asc" },
    });
    res.json({ message: "Courses retrieved successfully", courses });
  } catch (err) {
    respondInternalError(res, "Failed to fetch courses", err);
  }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        department: { select: { id: true, name: true, code: true } },
        teacherAssignings: {
          include: { teacher: { select: { id: true, full_name: true, email: true } } },
        },
      },
    });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course retrieved successfully", course });
  } catch (err) {
    respondInternalError(res, "Failed to fetch course", err);
  }
};

// Body is pre-validated + coerced by validateBody(createCourseBodySchema) /
// validateBody(updateCourseBodySchema) — see routes and validation/coursesSchemas.js.

export const createCourse = async (req, res) => {
  try {
    const { name, code, description, credits, departmentId, thumbnail, semesterNumber } =
      req.body;

    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ message: "Course code already in use" });

    const course = await prisma.course.create({
      data: {
        name,
        code,
        description: description || null,
        credits,
        semesterNumber: semesterNumber || null,
        departmentId,
        thumbnail: thumbnail || null,
      },
    });
    res.status(201).json({ message: "Course created successfully", course });
  } catch (err) {
    respondInternalError(res, "Failed to create course", err);
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { name, code, description, credits, departmentId, thumbnail, semesterNumber } =
      req.body;

    const data = {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(description !== undefined && { description: description || null }),
      ...(credits !== undefined && { credits }),
      ...(departmentId !== undefined && { departmentId }),
      ...(thumbnail !== undefined && { thumbnail: thumbnail || null }),
      ...(semesterNumber !== undefined && { semesterNumber: semesterNumber || null }),
    };

    const course = await prisma.course.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json({ message: "Course updated successfully", course });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Course not found" });
    respondInternalError(res, "Failed to update course", err);
  }
};

export const deleteCourse = async (req, res) => {
  try {
    await prisma.course.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Course not found" });
    respondInternalError(res, "Failed to delete course", err);
  }
};
