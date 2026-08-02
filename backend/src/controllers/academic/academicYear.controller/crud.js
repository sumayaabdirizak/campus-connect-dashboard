import { prisma } from "../../../db/prisma.js";
import { HttpError } from "../../../utils/httpError.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { deleteAcademicYearCascade } from "../../../features/academic/deleteAcademicYearCascade.js";

export const getAcademicYearById = async (req, res) => {
  const { id } = req.params;
  try {
    const year = await prisma.academicYear.findUnique({
      where: { id: Number(id) },
      include: { semesters: { orderBy: { sequence: "asc" } }, batches: true },
    });
    if (!year) return res.status(404).json({ message: "Academic year not found" });
    res.json({ message: "Academic year fetched", year });
  } catch (err) {
    respondInternalError(res, "Failed to fetch academic year", err);
  }
};

export const updateAcademicYear = async (req, res) => {
  const { id } = req.params;
  const { name, start_date, end_date } = req.body;
  try {
    const year = await prisma.academicYear.update({
      where: { id: Number(id) },
      data: {
        name,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
      },
    });
    res.json({ message: "Academic year updated", year });
  } catch (err) {
    respondInternalError(res, "Failed to update academic year", err);
  }
};

export const deleteAcademicYear = async (req, res) => {
  const { id } = req.params;
  try {
    const year = await deleteAcademicYearCascade(id);
    res.json({ message: "Academic year deleted", year: { id: year.id, name: year.name } });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err?.code === "P2003") {
      return res.status(409).json({
        message:
          "Cannot delete this academic year because related records still block removal. Try again or contact support.",
      });
    }
    respondInternalError(res, "Failed to delete academic year", err);
  }
};
