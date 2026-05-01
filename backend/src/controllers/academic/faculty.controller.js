// src/controllers/faculty.controller.js
import { prisma } from "../../db/prisma.js";

export const getAllFaculties = async (req, res) => {
  try {
    const faculties = await prisma.faculty.findMany({
      include: {
        departments: true,
        dean: { select: { id: true, full_name: true, email: true } }
      }
    });
    res.json({ message: "Faculties retrieved successfully", faculties });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch faculties", detail: err.message });
  }
};

export const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await prisma.faculty.findUnique({
      where: { id: Number(id) },
      include: {
        departments: true,
        dean: { select: { id: true, full_name: true, email: true } }
      }
    });
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });
    res.json({ message: "Faculty retrieved successfully", faculty });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch faculty", detail: err.message });
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ message: "Name and code are required" });
    const existing = await prisma.faculty.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ message: "Faculty code already in use" });

    const faculty = await prisma.faculty.create({ data: { name, code } });
    res.status(201).json({ message: "Faculty created successfully", faculty });
  } catch (err) {
    res.status(500).json({ message: "Failed to create faculty", detail: err.message });
  }
};

export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const faculty = await prisma.faculty.update({
      where: { id: Number(id) },
      data: { name, code }
    });
    res.json({ message: "Faculty updated successfully", faculty });
  } catch (err) {
    res.status(500).json({ message: "Failed to update faculty", detail: err.message });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.faculty.delete({ where: { id: Number(id) } });
    res.json({ message: "Faculty deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete faculty", detail: err.message });
  }
};

// PATCH /api/faculties/:facultyId/assign-dean
export const assignDean = async (req, res) => {
  try {
    const facultyId = Number(req.params.facultyId);
    const { deanId } = req.body;

    // Check user exists and is a DEAN
    const dean = await prisma.user.findUnique({
      where: { id: deanId },
      include: { role: true }
    });
    if (!dean) return res.status(404).json({ message: "Dean user not found." });
    if (dean.role.name !== "DEAN")
      return res.status(400).json({ message: "User is not a DEAN." });

    // Ensure faculty exists
    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) return res.status(404).json({ message: "Faculty not found." });

    // Assign
    const updatedFaculty = await prisma.faculty.update({
      where: { id: facultyId },
      data: { deanId: dean.id }
    });

    res.json({ message: "Dean assigned to faculty", faculty: updatedFaculty });
  } catch (err) {
    res.status(500).json({ message: "Dean assignment failed", error: err.message });
  }
};