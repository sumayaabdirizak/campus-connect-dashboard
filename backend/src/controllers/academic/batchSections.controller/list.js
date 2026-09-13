import { prisma } from "../../../db/prisma.js";
import { parsePaginationQuery, paginatedPayload } from "../../../utils/pagination.js";
import { getAuthFacultyId } from "../../../utils/facultyAccess.js";
import { whereBatchSectionsInFaculty } from "../../../utils/scopeWhere.js";
import { respondInternalError } from "../../../utils/httpError.js";

// GET all sections (optionally by batch) — paginated; scoped for DEAN / STUDENT
export const getAllBatchSections = async (req, res) => {
  try {
    const { batchId } = req.query;
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
    const role = req.user?.role;

    const batchFilter = batchId ? { batchId: Number(batchId) } : {};
    let where = { ...batchFilter };

    if (role === "DEAN") {
      const fid = getAuthFacultyId(req.user);
      if (fid == null) {
        return res.json(paginatedPayload({ total: 0, page, pageSize, results: [] }));
      }
      where = { AND: [batchFilter, whereBatchSectionsInFaculty(fid)] };
    } else if (role === "STUDENT" && req.user.facultyId != null) {
      where = {
        AND: [batchFilter, whereBatchSectionsInFaculty(Number(req.user.facultyId))],
      };
    }

    const [sections, total] = await Promise.all([
      prisma.batchSection.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          batch: {
            include: {
              academicYear: {
                include: { semesters: { orderBy: { sequence: 'asc' } } },
              },
              program: {
                include: { department: { select: { id: true, code: true, facultyId: true } } },
              },
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
      prisma.batchSection.count({ where }),
    ]);

    res.json(paginatedPayload({ total, page, pageSize, results: sections }));
  } catch (err) {
    respondInternalError(res, "Failed to fetch batch sections", err);
  }
};

// GET batch section by ID
export const getBatchSectionById = async (req, res) => {
  const { id } = req.params;
  try {
    const section = await prisma.batchSection.findUnique({
      where: { id: Number(id) },
      include: { batch: true },
    });
    if (!section) return res.status(404).json({ message: "Batch section not found" });
    res.json({ message: "Batch section fetched", section });
  } catch (err) {
    respondInternalError(res, "Failed to fetch batch section", err);
  }
};
