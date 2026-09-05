import { prisma } from "../../../db/prisma.js";
import { whereUsersInFaculty as inFacultyWhere } from "../../../utils/scopeWhere.js";
import { paginatedPayload } from "../../../utils/pagination.js";
import { respondInternalError } from "../../../utils/httpError.js";

export const getFacultyUsers = async (req, res) => {
  try {
    const {
      role,
      search,
      page = 1,
      limit = 20,
      departmentId,
      batchId,
      batchSectionId,
    } = req.query;
    const { facultyId } = req;
    const skip = (Number(page) - 1) * Number(limit);

    const andClauses = [];
    if (departmentId) {
      andClauses.push({ studentProfile: { departmentId: Number(departmentId) } });
    }
    if (batchSectionId) {
      andClauses.push({
        studentRegistrations: { some: { batchSectionId: Number(batchSectionId) } },
      });
    } else if (batchId) {
      andClauses.push({
        studentRegistrations: { some: { batchSection: { batchId: Number(batchId) } } },
      });
    }
    if (search) {
      andClauses.push({
        OR: [
          { full_name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { number: { contains: search, mode: "insensitive" } },
          { studentProfile: { student_number: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    const where = inFacultyWhere(facultyId, {
      ...(role ? { role: { name: role } } : {}),
      ...(andClauses.length ? { AND: andClauses } : {}),
    });

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          full_name: true,
          email: true,
          number: true,
          phone: true,
          status: true,
          must_change_password: true,
          last_login_at: true,
          created_at: true,
          role: { select: { name: true } },
          studentProfile: {
            select: {
              student_number: true,
              admission_year: true,
              facultyId: true,
              departmentId: true,
              programId: true,
            },
          },
          studentRegistrations: {
            where: { status: "ACTIVE" },
            take: 1,
            select: {
              batchSectionId: true,
              batchSection: {
                select: {
                  id: true,
                  name: true,
                  batchId: true,
                  batch: {
                    select: {
                      id: true,
                      name: true,
                      program: {
                        select: {
                          departmentId: true,
                          department: { select: { id: true, name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          lecturerProfile: {
            select: {
              specialty: true,
              hire_date: true,
              departmentId: true,
              faculties: { include: { faculty: { select: { id: true, name: true, code: true } } } },
            },
          },
          deanProfile: { select: { facultyId: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    const mapped = users.map((u) => {
      const registration = u.studentRegistrations?.[0];
      const batchSection = registration?.batchSection;
      return {
        ...u,
        role: u.role.name,
        isAssigned: (u.studentRegistrations?.length ?? 0) > 0,
        registration: batchSection
          ? {
              batchSectionId: registration.batchSectionId,
              batchSectionName: batchSection.name,
              batchId: batchSection.batch?.id,
              batchName: batchSection.batch?.name,
              departmentId: batchSection.batch?.program?.departmentId,
              departmentName: batchSection.batch?.program?.department?.name,
            }
          : null,
        studentRegistrations: undefined,
      };
    });

    res.json(
      paginatedPayload({
        total,
        page: Number(page),
        pageSize: Number(limit),
        results: mapped,
      })
    );
  } catch (e) {
    respondInternalError(res, "Failed to fetch users", e);
  }
};

export const getFacultyUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const user = await prisma.user.findFirst({
      where: inFacultyWhere(facultyId, { id: Number(id) }),
      select: {
        id: true,
        full_name: true,
        email: true,
        number: true,
        phone: true,
        status: true,
        created_at: true,
        role: { select: { name: true } },
        studentProfile: {
          select: {
            student_number: true,
            admission_year: true,
            facultyId: true,
            departmentId: true,
            programId: true,
          },
        },
        lecturerProfile: {
          select: {
            specialty: true,
            hire_date: true,
            faculties: { include: { faculty: true } },
          },
        },
        studentRegistrations: {
          include: {
            batchSection: { include: { batch: { include: { program: true } } } },
            currentAcademicYear: true,
            currentSemester: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(403).json({ message: "User not found in your faculty." });
    }

    res.json({ user: { ...user, role: user.role.name } });
  } catch (e) {
    respondInternalError(res, "Failed to fetch user", e);
  }
};
