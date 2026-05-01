import { prisma } from "../../db/prisma.js";

// Get all academic years
export const getAllAcademicYears = async (req, res) => {
  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { start_date: "desc" },
      include: { semesters: true, batches: true }
    });
    res.json({ message: "Academic years fetched", years });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch academic years", error: err.message });
  }
};

// Get single academic year by id
export const getAcademicYearById = async (req, res) => {
  const { id } = req.params;
  try {
    const year = await prisma.academicYear.findUnique({
      where: { id: Number(id) },
      include: { semesters: true, batches: true }
    });
    if (!year) return res.status(404).json({ message: "Academic year not found" });
    res.json({ message: "Academic year fetched", year });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch academic year", error: err.message });
  }
};

// Create academic year
export const createAcademicYear = async (req, res) => {
  const { name, start_date, end_date } = req.body;
  try {
    const year = await prisma.academicYear.create({
      data: {
        name,
        start_date: new Date(start_date),
        end_date: new Date(end_date)
      }
    });
    res.status(201).json({ message: "Academic year created", year });
  } catch (err) {
    if (err.code === "P2002") {
      res.status(409).json({ message: "Academic year name must be unique." });
    } else {
      res.status(500).json({ message: "Failed to create academic year", error: err.message });
    }
  }
};

// Update academic year
export const updateAcademicYear = async (req, res) => {
  const { id } = req.params;
  const { name, start_date, end_date } = req.body;
  try {
    const year = await prisma.academicYear.update({
      where: { id: Number(id) },
      data: {
        name,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined
      }
    });
    res.json({ message: "Academic year updated", year });
  } catch (err) {
    res.status(500).json({ message: "Failed to update academic year", error: err.message });
  }
};

// Delete academic year
export const deleteAcademicYear = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.academicYear.delete({ where: { id: Number(id) } });
    res.json({ message: "Academic year deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete academic year", error: err.message });
  }
};

// --- PROMOTE LOGIC ---
export const promoteAcademicYear = async (req, res) => {
  try {
    // Get latest
    const latestYear = await prisma.academicYear.findFirst({
      orderBy: { end_date: "desc" }
    });
    if (!latestYear) return res.status(400).json({ message: "No academic year found." });

    // Compute next year name and range
    const split = latestYear.name.split("/");
    const thisStart = parseInt(split[0]);
    const thisEnd = parseInt(split[1]);
    if (isNaN(thisStart) || isNaN(thisEnd)) {
      return res.status(400).json({ message: "Academic year name format must be 'YYYY/YYYY'." });
    }
    const nextStart = thisEnd;
    const nextEnd = thisEnd + 1;
    const nextYearName = `${nextStart}/${nextEnd}`;

    // Already exists?
    const already = await prisma.academicYear.findUnique({ where: { name: nextYearName } });
    if (already) return res.status(409).json({ message: `Academic Year ${nextYearName} already exists.` });

    // Dates
    const newStartDate = new Date(latestYear.end_date);
    newStartDate.setDate(newStartDate.getDate() + 1);
    const newEndDate = new Date(newStartDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    newEndDate.setDate(newEndDate.getDate() - 1);

    // Date conflict?
    const dateConflict = await prisma.academicYear.findFirst({
      where: {
        OR: [
          { start_date: newStartDate },
          { end_date: newEndDate }
        ]
      }
    });
    if (dateConflict) {
      return res.status(400).json({ message: "Academic Year with these dates already exists." });
    }

    // Create new Academic Year
    const newYear = await prisma.academicYear.create({
      data: {
        name: nextYearName,
        start_date: newStartDate,
        end_date: newEndDate
      }
    });

    // Create Semesters (adjust dates as you need per institution!)
    const semester1Start = new Date(newYear.start_date);
    const semester1End = new Date(semester1Start);
    semester1End.setMonth(semester1End.getMonth() + 4); // 5 months
    semester1End.setDate(new Date(semester1End.getFullYear(), semester1End.getMonth() + 1, 0).getDate());

    const semester2Start = new Date(semester1End);
    semester2Start.setDate(semester2Start.getDate() + 1);
    const semester2End = new Date(newYear.end_date);

    await prisma.semester.createMany({
      data: [
        {
          name: "Semester 1",
          sequence: 1,
          academicYearId: newYear.id,
          start_date: semester1Start,
          end_date: semester1End
        },
        {
          name: "Semester 2",
          sequence: 2,
          academicYearId: newYear.id,
          start_date: semester2Start,
          end_date: semester2End
        }
      ]
    });

    // Increment batches
    const updated = await prisma.batch.updateMany({
      data: {
        semester_number: { increment: 1 }
      }
    });

    return res.json({
      message: `Promoted to Academic Year ${nextYearName}, semesters created, batches updated!`,
      newYear,
      semesters: [
        { name: "Semester 1", start: semester1Start, end: semester1End },
        { name: "Semester 2", start: semester2Start, end: semester2End }
      ],
      batchesUpdated: updated.count
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to promote academic year", error: err.message });
  }
};