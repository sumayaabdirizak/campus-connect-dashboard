import { prisma } from "../../../db/prisma.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { namedListSuccess } from "../../../utils/apiEnvelope.js";
import { parsePaginationQuery } from "../../../utils/pagination.js";
import { facultyScopeForRestrictedAcademicRoles } from "../facultyScope.js";

// GET all departments (include faculty and programs)
export const getAllDepartments = async (req, res) => {
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const { search } = req.query;
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
    const baseWhere =
      scope.mode === "faculty"
        ? { facultyId: scope.facultyId }
        : scope.mode === "none"
          ? { facultyId: -1 }
          : {};
    const where = {
      ...baseWhere,
      ...(search
        ? {
            OR: [
              { name: { contains: String(search), mode: "insensitive" } },
              { code: { contains: String(search), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [totalCount, departments] = await Promise.all([
      prisma.department.count({ where }),
      prisma.department.findMany({
        where,
        include: {
          faculty: true,
          programs: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
    ]);

    res.json(
      namedListSuccess({
        message: "Departments fetched",
        name: "departments",
        items: departments,
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (err) {
    respondInternalError(res, "Failed to fetch departments", err);
  }
};

// GET department by ID
export const getDepartmentById = async (req, res) => {
  const { id } = req.params;
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const department = await prisma.department.findUnique({
      where: { id: Number(id) },
      include: {
        faculty: true,
        programs: true,
      },
    });
    if (!department) return res.status(404).json({ message: "Department not found" });
    if (scope.mode === "faculty" && Number(department.facultyId) !== Number(scope.facultyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (scope.mode === "none") {
      return res.status(403).json({ message: "No faculty scope for this account" });
    }
    res.json({ message: "Department fetched", department });
  } catch (err) {
    respondInternalError(res, "Failed to fetch department", err);
  }
};
