import { prisma } from "../../../db/prisma.js";
import { parsePaginationQuery, paginatedPayload } from "../../../utils/pagination.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertFacultyBatch, getFacultyProgramIds } from "./helpers.js";

export const getFacultyBatches = async (req, res) => {
  try {
    const { facultyId } = req;
    const { programId, academicYearId, search } = req.query;
    const programIds = await getFacultyProgramIds(facultyId);
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const where = {
      programId: programId ? Number(programId) : { in: programIds },
      ...(academicYearId ? { academicYearId: Number(academicYearId) } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };

    const [totalCount, batches] = await Promise.all([
      prisma.batch.count({ where }),
      prisma.batch.findMany({
        where,
        include: {
          program: { include: { department: { select: { id: true, name: true } } } },
          academicYear: true,
          sections: {
            include: {
              _count: { select: { studentRegistrations: true, courseOfferings: true } },
            },
          },
          _count: { select: { sections: true } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      status: "success",
      message: "Batches fetched",
      count: totalCount,
      batches,
      ...paginatedPayload({ totalCount, page, pageSize, results: batches }),
    });
  } catch (e) {
    respondInternalError(res, "Failed to fetch batches", e);
  }
};

export const getFacultyBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const batch = await assertFacultyBatch(id, facultyId, res);
    if (!batch) return;

    const full = await prisma.batch.findUnique({
      where: { id: Number(id) },
      include: {
        program: { include: { department: { include: { faculty: true } } } },
        academicYear: true,
        sections: {
          include: {
            studentRegistrations: {
              include: {
                student: { select: { id: true, full_name: true, number: true, email: true } },
              },
            },
            courseOfferings: {
              include: {
                course: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
    });

    res.json({ batch: full });
  } catch (e) {
    respondInternalError(res, "Failed to fetch batch", e);
  }
};
