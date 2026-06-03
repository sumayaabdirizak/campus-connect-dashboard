import { prisma } from "../../db/prisma.js";
import { hashPassword } from "../../utils/password.js";
import { HttpError } from "../../utils/httpError.js";
import { parsePaginationQuery, paginatedPayload } from "../../utils/pagination.js";
import { syncDiscussionMembershipsForUser } from "../../features/discussions/membershipSync.service.js";

// Get all users with pagination and search
export const getAllUsers = async (req, res) => {
  const { page, pageSize, skip } = parsePaginationQuery(req.query);
  const { search, role } = req.query;

    const where = {
      ...(search ? {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      } : {}),
      ...(role ? { role: { name: role } } : {})
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
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
              programId: true
            }
          },
          lecturerProfile: {
            include: {
              faculties: {
                include: { faculty: true }
              }
            }
          },
          deanProfile: {
            include: { faculty: true }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    const mappedUsers = users.map(u => ({
      ...u,
      role: u.role.name,
      faculties: u.lecturerProfile?.faculties?.map(f => ({
        id: f.faculty.id,
        name: f.faculty.name,
        code: f.faculty.code
      })) ?? []
    }));

    res.json(paginatedPayload({ total, page, pageSize, results: mappedUsers }));
};


// Register a new user (admin)
export const registerUserByAdmin = async (req, res) => {
    const { full_name, email, password, role, departmentCode, number, programId, specialty, batchSectionId, academicYearId, semesterId, courseIds } = req.body;

    const roleObj = await prisma.role.findUnique({ where: { name: role } });
    if (!roleObj) throw new HttpError(400, `Role '${role}' does not exist`, null);

    if ((role === "DEAN" || role === "FACULTY_ADMIN") && !departmentCode) {
      throw new HttpError(
        400,
        "departmentCode is required to assign faculty scope for DEAN and FACULTY_ADMIN",
        null
      );
    }

    // Get Department & Faculty from departmentCode
    let departmentId = null;
    let facultyId = null;
    if (departmentCode) {
      const dept = await prisma.department.findUnique({
        where: { code: departmentCode },
        include: { faculty: true }
      });
      if (!dept) throw new HttpError(400, `Department with code '${departmentCode}' not found`, null);
      departmentId = dept.id;
      facultyId = dept.facultyId;
    }

    // Hash password (cost 12, via shared helper — keeps factor consistent
    // with the rest of the app).
    const password_hash = await hashPassword(password);

    // Create user with nested profile based on role
    const user = await prisma.user.create({
      data: {
        full_name,
        email,
        number,
        password_hash,
        roleId: roleObj.id,
        // Conditional Profile Creation
        ...(role === 'STUDENT' ? {
          studentProfile: {
            create: {
              student_number: number,
              admission_year: new Date().getFullYear(),
              facultyId: facultyId || 0,
              departmentId: departmentId || 0,
              programId: programId || 0
            }
          },
          ...(batchSectionId && academicYearId && semesterId ? {
            studentRegistrations: {
              create: {
                batchSectionId: Number(batchSectionId),
                registrationAcademicYearId: Number(academicYearId),
                currentAcademicYearId: Number(academicYearId),
                currentSemesterId: Number(semesterId)
              }
            }
          } : {})
        } : {}),
        ...(role === 'TEACHER' ? {
          lecturerProfile: {
            create: {
              specialty: specialty || 'General',
              departmentId: departmentId || 0,
              faculties: facultyId ? {
                create: { facultyId }
              } : undefined
            }
          },
          ...(courseIds && Array.isArray(courseIds) ? {
            teacherAssignings: {
              create: courseIds.map(cid => ({ courseId: Number(cid) }))
            }
          } : {})
        } : {}),
        ...(role === 'DEAN' ? {
          deanProfile: {
            create: { facultyId: facultyId || 0 }
          }
        } : {}),
        ...(role === 'FACULTY_ADMIN' ? {
          facultyAdminProfile: {
            create: { faculty_id: facultyId || 0 }
          }
        } : {})
      },
      include: {
        role: { select: { name: true } },
        studentProfile: true,
        lecturerProfile: true,
        deanProfile: true,
        facultyAdminProfile: true
      }
    });

    try {
      await syncDiscussionMembershipsForUser(user.id);
    } catch (error) {
      console.error("Failed to sync discussion memberships after user registration", {
        userId: user.id,
        error: error?.message,
      });
    }

    return res.status(201).json({
      message: `${role} registered successfully`,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        number: user.number,
        role: user.role.name,
        profiles: {
          student: user.studentProfile,
          lecturer: user.lecturerProfile,
          dean: user.deanProfile,
          facultyAdmin: user.facultyAdminProfile
        }
      }
    });
};

// Get current user profile
export const getMe = async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        full_name: true,
        email: true,
        number: true,
        phone: true,
        smsOptIn: true,
        status: true,
        created_at: true,
        updated_at: true,
        roleId: true,
        role: true,
        studentProfile: true,
        lecturerProfile: {
          include: {
            faculties: { include: { faculty: true } }
          }
        },
        deanProfile: { include: { faculty: true } },
        facultyAdminProfile: { include: { faculty: true } }
      }
    });

    if (!user) throw new HttpError(404, "User not found", null);

    const roleName = user.role.name;
    const result = {
      ...user,
      role: roleName,
      faculties: user.lecturerProfile?.faculties?.map(f => ({
        id: f.faculty.id,
        name: f.faculty.name
      })) ?? [],
      scope: {
        facultyId: req.user.facultyId ?? null,
        departmentId: req.user.departmentId ?? null,
        programId: req.user.programId ?? null,
        facultyIds: Array.isArray(req.user.facultyIds) ? req.user.facultyIds : []
      }
    };

    res.json(result);
};

export const patchMe = async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.sub },
    data: { smsOptIn: req.body.smsOptIn },
  });
  return getMe(req, res);
};