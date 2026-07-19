/**
 * User registration helpers for admin-created accounts.
 * Handles role-specific profile creation and discussion membership sync.
 */
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../../utils/password.js';
import { HttpError } from '../../utils/httpError.js';
import { syncDiscussionMembershipsForUser } from '../../features/discussions/membershipSync.service.js';

/**
 * Resolve department & faculty from departmentCode.
 * Returns { departmentId, facultyId } or throws HttpError if not found.
 */
export async function resolveDepartmentAndFaculty(departmentCode) {
  if (!departmentCode) return { departmentId: null, facultyId: null };
  const dept = await prisma.department.findUnique({
    where: { code: departmentCode },
    include: { faculty: true },
  });
  if (!dept) throw new HttpError(400, `Department with code '${departmentCode}' not found`, null);
  return { departmentId: dept.id, facultyId: dept.facultyId };
}

/**
 * Build the Prisma nested-create `data` block for a new user, including
 * role-specific profile and optional course/registration relations.
 */
export function buildUserCreateData({
  full_name, email, number, password_hash, roleId, role,
  facultyId, departmentId, programId, specialty,
  batchSectionId, academicYearId, semesterId, courseIds,
}) {
  return {
    full_name,
    email,
    number,
    password_hash,
    roleId,
    ...(role === 'STUDENT' ? {
      studentProfile: {
        create: {
          student_number: number,
          admission_year: new Date().getFullYear(),
          facultyId: facultyId || 0,
          departmentId: departmentId || 0,
          programId: programId || 0,
        },
      },
      ...(batchSectionId && academicYearId && semesterId ? {
        studentRegistrations: {
          create: {
            batchSectionId: Number(batchSectionId),
            registrationAcademicYearId: Number(academicYearId),
            currentAcademicYearId: Number(academicYearId),
            currentSemesterId: Number(semesterId),
          },
        },
      } : {}),
    } : {}),
    ...(role === 'TEACHER' ? {
      lecturerProfile: {
        create: {
          specialty: specialty || 'General',
          departmentId: departmentId || 0,
          faculties: facultyId ? { create: { facultyId } } : undefined,
        },
      },
      ...(courseIds && Array.isArray(courseIds) ? {
        teacherAssignings: {
          create: courseIds.map((cid) => ({ courseId: Number(cid) })),
        },
      } : {}),
    } : {}),
    ...(role === 'DEAN' ? {
      deanProfile: { create: { facultyId: facultyId || 0 } },
    } : {}),
    ...(role === 'FACULTY_ADMIN' ? {
      facultyAdminProfile: { create: { faculty_id: facultyId || 0 } },
    } : {}),
  };
}

/**
 * Register a new user from the admin panel.
 */
export async function registerUserByAdmin(req, res) {
  const {
    full_name, email, password, role, departmentCode, number,
    programId, specialty, batchSectionId, academicYearId, semesterId, courseIds,
  } = req.body;

  const roleObj = await prisma.role.findUnique({ where: { name: role } });
  if (!roleObj) throw new HttpError(400, `Role '${role}' does not exist`, null);

  if ((role === 'DEAN' || role === 'FACULTY_ADMIN') && !departmentCode) {
    throw new HttpError(
      400,
      'departmentCode is required to assign faculty scope for DEAN and FACULTY_ADMIN',
      null
    );
  }

  const { departmentId, facultyId } = await resolveDepartmentAndFaculty(departmentCode);
  const password_hash = await hashPassword(password);

  const user = await prisma.user.create({
    data: buildUserCreateData({
      full_name, email, number, password_hash, roleId: roleObj.id, role,
      facultyId, departmentId, programId, specialty,
      batchSectionId, academicYearId, semesterId, courseIds,
    }),
    include: {
      role: { select: { name: true } },
      studentProfile: true,
      lecturerProfile: true,
      deanProfile: true,
      facultyAdminProfile: true,
    },
  });

  try {
    await syncDiscussionMembershipsForUser(user.id);
  } catch (error) {
    console.error('Failed to sync discussion memberships after user registration', {
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
        facultyAdmin: user.facultyAdminProfile,
      },
    },
  });
}
