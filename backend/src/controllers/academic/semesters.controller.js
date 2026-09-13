import { prisma } from "../../db/prisma.js";
import { respondInternalError } from "../../utils/httpError.js";
import { getNextSemesterSequence } from "../../services/academic/semesterSequence.js";

export const createSemester = async (req, res) => {
  const yearId = Number(req.params.yearId);
  const { name, start_date, end_date } = req.body;

  const year = await prisma.academicYear.findUnique({ where: { id: yearId } });
  if (!year) return res.status(404).json({ message: "Academic year not found" });

  try {
    const [sequence] = await getNextSemesterSequence(1);
    const semester = await prisma.semester.create({
      data: {
        name: name?.trim() || `Semester ${sequence}`,
        sequence,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        academicYearId: yearId,
      },
    });
    res.status(201).json({ message: "Semester created", semester });
  } catch (err) {
    respondInternalError(res, "Failed to create semester", err);
  }
};

export const updateSemester = async (req, res) => {
  const yearId = Number(req.params.yearId);
  const semesterId = Number(req.params.semesterId);
  const { name, start_date, end_date } = req.body;

  try {
    const existing = await prisma.semester.findFirst({
      where: { id: semesterId, academicYearId: yearId },
    });
    if (!existing) return res.status(404).json({ message: "Semester not found" });

    // sequence is global and immutable after create (always +1 chain).
    const semester = await prisma.semester.update({
      where: { id: semesterId },
      data: {
        name,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
      },
    });
    res.json({ message: "Semester updated", semester });
  } catch (err) {
    respondInternalError(res, "Failed to update semester", err);
  }
};

export const deleteSemester = async (req, res) => {
  const yearId = Number(req.params.yearId);
  const semesterId = Number(req.params.semesterId);

  try {
    const existing = await prisma.semester.findFirst({
      where: { id: semesterId, academicYearId: yearId },
    });
    if (!existing) return res.status(404).json({ message: "Semester not found" });

    await prisma.semester.delete({ where: { id: semesterId } });
    res.json({ message: "Semester deleted" });
  } catch (err) {
    if (err.code === "P2003") {
      return res.status(409).json({
        message: "Cannot delete semester with registrations or course offerings.",
      });
    }
    respondInternalError(res, "Failed to delete semester", err);
  }
};

/** Flat list of all semesters ordered by global sequence. */
export const getAllSemesters = async (req, res) => {
  try {
    const { renumber } = req.query;
    if (["1", "true", "yes"].includes(String(renumber ?? "").toLowerCase())) {
      const { renumberSemestersGloballyIfNeeded } = await import(
        "../../services/academic/semesterSequence.js"
      );
      await renumberSemestersGloballyIfNeeded();
    }

    const semesters = await prisma.semester.findMany({
      orderBy: { sequence: "asc" },
      include: {
        academicYear: { select: { id: true, name: true } },
      },
    });
    res.json({ message: "Semesters fetched", semesters });
  } catch (err) {
    respondInternalError(res, "Failed to fetch semesters", err);
  }
};
