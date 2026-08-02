import { prisma } from "../../db/prisma.js";
import { archiveDiscussionGroupForScope } from "../../services/discussions/groupProvisioning.service.js";
import { DISCUSSION_SCOPE_TYPES } from "../../services/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../services/discussions/membershipSync.service.js";
import { enrichBatchWithCohortSemester, getSemesterInYear } from "../../services/academic/academicCalendar.js";
import { ensureAcademicYearForDate } from "../../services/academic/ensureAcademicYear.js";
import { parseAcademicYearStartYear } from "../../services/academic/academicCalendarDefaults.js";
import { graduateCompletedCohorts } from "../../services/academic/graduateCompletedCohorts.js";
import { respondInternalError } from "../../utils/httpError.js";

const batchIncludeSafe = {
  program: {
    include: {
      department: {
        include: { faculty: { select: { id: true, code: true, defaultDurationYears: true } } },
      },
    },
  },
  academicYear: true,
};

const batchInclude = {
  ...batchIncludeSafe,
  graduationAcademicYear: { select: { id: true, name: true } },
};

export const getAllBatches = async (req, res) => {
  try {
    try {
      await graduateCompletedCohorts(new Date());
    } catch (gradErr) {
      console.error("graduateCompletedCohorts skipped on batches list", gradErr?.message);
    }

    const { academicYearId, programId, status } = req.query;
    const where = {};
    if (academicYearId) where.academicYearId = Number(academicYearId);
    if (programId) where.programId = Number(programId);

    let batches;
    try {
      if (status) where.status = String(status).toUpperCase();
      batches = await prisma.batch.findMany({
        where,
        include: batchInclude,
        orderBy: [{ status: "asc" }, { name: "asc" }],
      });
    } catch (err) {
      // Stale Prisma client without EnrollmentStatus fields.
      delete where.status;
      batches = await prisma.batch.findMany({
        where,
        include: batchIncludeSafe,
        orderBy: { name: "asc" },
      });
    }

    res.json({
      message: "Batches fetched",
      batches: batches.map((batch) => enrichBatchWithCohortSemester(batch)),
    });
  } catch (err) {
    respondInternalError(res, "Failed to fetch batches", err);
  }
};

export const getBatchById = async (req, res) => {
  const { id } = req.params;
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: Number(id) },
      include: batchInclude,
    });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json({ message: "Batch fetched", batch: enrichBatchWithCohortSemester(batch) });
  } catch (err) {
    respondInternalError(res, "Failed to fetch batch", err);
  }
};

export const createBatch = async (req, res) => {
  const { name, academic_year, programId, academicYearId, semester_number } = req.body;
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      department: { include: { faculty: { select: { defaultDurationYears: true } } } },
    },
  });
  if (!program) return res.status(400).json({ message: "Invalid programId" });

  let ay = academicYearId
    ? await prisma.academicYear.findUnique({ where: { id: Number(academicYearId) } })
    : null;
  if (!ay) {
    const ensured = await ensureAcademicYearForDate(new Date());
    ay = ensured.year;
  }
  if (!ay) return res.status(400).json({ message: "Invalid academicYearId" });

  const startYear = parseAcademicYearStartYear(ay.name) ?? Number(academic_year);
  const initialSemester = Number(semester_number) || getSemesterInYear(new Date());
  const maxSemesters =
    (program.durationYears || program.department?.faculty?.defaultDurationYears || 4) * 2;
  if (initialSemester > maxSemesters) {
    return res.status(400).json({
      message: `Semester ${initialSemester} exceeds program duration (${maxSemesters} semesters).`,
    });
  }

  try {
    const batch = await prisma.batch.create({
      data: {
        name,
        academic_year: startYear,
        programId,
        academicYearId: ay.id,
        semester_number: initialSemester,
      },
      include: batchInclude,
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
        scopeId: batch.id,
      });
    } catch (error) {
      console.error("Failed to auto-create batch discussion group", {
        batchId: batch.id,
        error: error?.message,
      });
    }
    res.status(201).json({
      message: "Batch created",
      batch: enrichBatchWithCohortSemester(batch),
    });
  } catch (err) {
    if (err.code === "P2002") {
      res.status(409).json({ message: "Batch already exists for this program and academic year" });
    } else {
      respondInternalError(res, "Failed to create batch", err);
    }
  }
};

export const updateBatch = async (req, res) => {
  const { id } = req.params;
  const { name, academic_year, programId, academicYearId, semester_number, advisorUserId } =
    req.body;
  try {
    const batch = await prisma.batch.update({
      where: { id: Number(id) },
      data: {
        name,
        academic_year,
        programId,
        academicYearId,
        semester_number,
        ...(advisorUserId !== undefined && {
          advisorUserId:
            advisorUserId === null || advisorUserId === "" ? null : Number(advisorUserId),
        }),
      },
      include: batchInclude,
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
        scopeId: batch.id,
      });
    } catch (error) {
      console.error("Failed to refresh batch discussion group after update", {
        batchId: batch.id,
        error: error?.message,
      });
    }
    res.json({ message: "Batch updated", batch: enrichBatchWithCohortSemester(batch) });
  } catch (err) {
    respondInternalError(res, "Failed to update batch", err);
  }
};

export const deleteBatch = async (req, res) => {
  const { id } = req.params;
  try {
    const sectionsInBatch = await prisma.batchSection.findMany({
      where: { batchId: Number(id) },
      select: { id: true },
    });
    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
      scopeId: Number(id),
    });
    for (const section of sectionsInBatch) {
      await archiveDiscussionGroupForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
        scopeId: section.id,
      });
    }
    await prisma.batch.delete({ where: { id: Number(id) } });
    res.json({ message: "Batch deleted" });
  } catch (err) {
    respondInternalError(res, "Failed to delete batch", err);
  }
};
