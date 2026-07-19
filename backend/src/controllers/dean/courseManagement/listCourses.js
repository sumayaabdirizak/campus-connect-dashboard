import { prisma } from "../../../db/prisma.js";
import { parsePaginationQuery, paginatedPayload } from "../../../utils/pagination.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertFacultyCourse, getFacultyDepartmentIds } from "./helpers.js";

export const getFacultyCourses = async (req, res) => {
  try {
    const { facultyId } = req;
    const { search, departmentId } = req.query;
    const deptIds = await getFacultyDepartmentIds(facultyId);
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const where = {
      departmentId: departmentId ? Number(departmentId) : { in: deptIds },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [totalCount, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, code: true } },
          teacherAssignings: {
            include: {
              teacher: { select: { id: true, full_name: true, email: true } },
            },
          },
          _count: { select: { offerings: true, teacherAssignings: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
    ]);

    res.json({
      status: "success",
      message: "Courses fetched",
      count: totalCount,
      courses,
      ...paginatedPayload({ totalCount, page, pageSize, results: courses }),
    });
  } catch (e) {
    respondInternalError(res, "Failed to fetch courses", e);
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const course = await assertFacultyCourse(id, facultyId, res);
    if (!course) return;

    const full = await prisma.course.findUnique({
      where: { id: Number(id) },
      include: {
        department: true,
        teacherAssigning: {
          include: {
            teacher: {
              select: {
                id: true,
                full_name: true,
                email: true,
                number: true,
                lecturerProfile: { select: { specialty: true } },
              },
            },
          },
        },
        offerings: {
          include: {
            section: { include: { batch: { include: { program: true } } } },
            semester: true,
            academicYear: true,
          },
        },
      },
    });

    res.json({ course: full });
  } catch (e) {
    respondInternalError(res, "Failed to fetch course", e);
  }
};
