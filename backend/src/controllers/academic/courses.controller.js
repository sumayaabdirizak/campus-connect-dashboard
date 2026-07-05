import { prisma } from "../../db/prisma.js";

export const getAllCourses = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = departmentId ? { departmentId: Number(departmentId) } : {};
    const courses = await prisma.course.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { code: "asc" },
    });
    res.json({ message: "Courses retrieved successfully", courses });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch courses", detail: err.message });
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
    res.status(500).json({ message: "Failed to fetch course", detail: err.message });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { name, code, description, credits, departmentId, thumbnail } = req.body;
    if (!name || !code || !departmentId)
      return res.status(400).json({ message: "name, code, and departmentId are required" });

    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ message: "Course code already in use" });

    const course = await prisma.course.create({
      data: {
        name,
        code,
        description: description ?? null,
        credits: credits ? Number(credits) : 3,
        departmentId: Number(departmentId),
        thumbnail: thumbnail ?? null,
      },
    });
    res.status(201).json({ message: "Course created successfully", course });
  } catch (err) {
    res.status(500).json({ message: "Failed to create course", detail: err.message });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { name, code, description, credits, departmentId, thumbnail } = req.body;
    const course = await prisma.course.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(credits !== undefined && { credits: Number(credits) }),
        ...(departmentId !== undefined && { departmentId: Number(departmentId) }),
        ...(thumbnail !== undefined && { thumbnail }),
      },
    });
    res.json({ message: "Course updated successfully", course });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Course not found" });
    res.status(500).json({ message: "Failed to update course", detail: err.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    await prisma.course.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Course not found" });
    res.status(500).json({ message: "Failed to delete course", detail: err.message });
  }
};
