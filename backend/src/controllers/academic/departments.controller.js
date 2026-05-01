import { prisma } from "../../db/prisma.js";

// GET all departments (include faculty and programs)
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        faculty: true,
        programs: true,
      },
    });
    res.json({ message: "Departments fetched", departments });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch departments", error: err.message });
  }
};

// GET department by ID
export const getDepartmentById = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await prisma.department.findUnique({
      where: { id: Number(id) },
      include: {
        faculty: true,
        programs: true,
      },
    });
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json({ message: "Department fetched", department });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch department", error: err.message });
  }
};

// CREATE department
export const createDepartment = async (req, res) => {
  const { name, code, facultyId } = req.body;
  if (!name || !code || !facultyId) {
    return res.status(400).json({ message: "name, code, and facultyId are required" });
  }
  try {
    const department = await prisma.department.create({
      data: { name, code, facultyId: Number(facultyId) },
      include: { faculty: true, programs: true },
    });
    res.status(201).json({ message: "Department created", department });
  } catch (err) {
    res.status(500).json({ message: "Failed to create department", error: err.message });
  }
};

// UPDATE department
export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, code, facultyId } = req.body;
  try {
    const department = await prisma.department.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(facultyId && { facultyId: Number(facultyId) }),
      },
      include: { faculty: true, programs: true },
    });
    res.json({ message: "Department updated", department });
  } catch (err) {
    res.status(500).json({ message: "Failed to update department", error: err.message });
  }
};

// DELETE department
export const deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.department.delete({ where: { id: Number(id) } });
    res.json({ message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete department", error: err.message });
  }
};