import { prisma } from "../../db/prisma.js";

// Get all batches (filter by academicYearId/programId if needed)
export const getAllBatches = async (req, res) => {
  try {
    const { academicYearId, programId } = req.query;
    const where = {};
    if (academicYearId) where.academicYearId = Number(academicYearId);
    if (programId) where.programId = Number(programId);

    const batches = await prisma.batch.findMany({
      where,
      include: { program: true, academicYear: true }
    });
    res.json({ message: "Batches fetched", batches });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch batches", error: err.message });
  }
};

// Get single batch
export const getBatchById = async (req, res) => {
  const { id } = req.params;
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: Number(id) },
      include: { program: true, academicYear: true }
    });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json({ message: "Batch fetched", batch });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch batch", error: err.message });
  }
};

// Create batch
export const createBatch = async (req, res) => {
  const { name, academic_year, programId, academicYearId, semester_number } = req.body;
  // Validate program and academicYear exist
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) return res.status(400).json({ message: "Invalid programId" });
  const ay = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!ay) return res.status(400).json({ message: "Invalid academicYearId" });

  try {
    const batch = await prisma.batch.create({
      data: {
        name,
        academic_year,
        programId,
        academicYearId,
        semester_number: semester_number ?? 1
      }
    });
    res.status(201).json({ message: "Batch created", batch });
  } catch (err) {
    if (err.code === "P2002") {
      res.status(409).json({ message: "Batch already exists for this program and academic year" });
    } else {
      res.status(500).json({ message: "Failed to create batch", error: err.message });
    }
  }
};

// Update batch
export const updateBatch = async (req, res) => {
  const { id } = req.params;
  const { name, academic_year, programId, academicYearId, semester_number } = req.body;
  try {
    const batch = await prisma.batch.update({
      where: { id: Number(id) },
      data: {
        name,
        academic_year,
        programId,
        academicYearId,
        semester_number
      }
    });
    res.json({ message: "Batch updated", batch });
  } catch (err) {
    res.status(500).json({ message: "Failed to update batch", error: err.message });
  }
};

// Delete batch
export const deleteBatch = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.batch.delete({ where: { id: Number(id) } });
    res.json({ message: "Batch deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete batch", error: err.message });
  }
};