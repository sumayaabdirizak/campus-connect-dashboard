/**
 * User registration helpers for admin-created accounts.
 * Handles role-specific profile creation and discussion membership sync.
 */
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../../utils/password.js';
import { HttpError } from '../../utils/httpError.js';
import { generateUniversityId } from '../../services/auth/generateUniversityId.js';
import { syncDiscussionMembershipsForUser } from '../../services/discussions/membershipSync.service.js';
import { normalizeRoleName } from '../../../../shared/roles.js';

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

async function assertUserRegistrationAllowed({ email, number, role, facultyId }) {
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new HttpError(409, `Email "${email}" is already registered.`, null);
  }

  const existingNumber = await prisma.user.findUnique({ where: { number } });
  if (existingNumber) {
    throw new HttpError(409, `University ID "${number}" is already in use.`, null);
  }

  if (role !== 'DEAN' || !facultyId) return;

  const existingDean = await prisma.deanProfile.findUnique({
    where: { facultyId },
    include: {
      user: { select: { full_name: true, email: true } },
      faculty: { select: { name: true, code: true } },
    },
  });

  if (!existingDean) return;

  const deanLabel =
    existingDean.user?.full_name || existingDean.user?.email || 'another dean';
  const facultyLabel =
    existingDean.faculty?.name || existingDean.faculty?.code || 'this faculty';

  throw new HttpError(
    409,
    `${facultyLabel} already has a dean (${deanLabel}). Each faculty can only have one dean.`,
    null,
  );
}

/**
 * Build the Prisma nested-create `data` block for a new user, including
 * role-specific profile and optional course/registration relations.
 */
export function buildUserCreateData({
  full_name, email, number, password_hash, roleId, role,
  facultyId, departmentId, programId, specialty,
  batchSectionId, academicYearId, semesterId, courseIds, secondaryFacultyId,
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
          facultyId: Number(facultyId),
          departmentId: Number(departmentId),
          programId: Number(programId),
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
          departmentId: Number(departmentId),
          faculties: facultyId
            ? {
                create: [
                  { facultyId: Number(facultyId) },
                  ...(secondaryFacultyId && Number(secondaryFacultyId) !== Number(facultyId)
                    ? [{ facultyId: Number(secondaryFacultyId) }]
                    : []),
                ],
              }
            : undefined,
        },
      },
      ...(courseIds && Array.isArray(courseIds) ? {
        teacherAssignings: {
          create: courseIds.map((cid) => ({ courseId: Number(cid) })),
        },
      } : {}),
    } : {}),
    ...(role === 'DEAN' ? {
      deanProfile: { create: { facultyId: Number(facultyId) } },
    } : {}),
  };
}

/**
 * Register a new user from the admin panel.
 */
export async function registerUserByAdmin(req, res) {
  const {
    full_name, email, password, role: rawRole, departmentCode, facultyId: bodyFacultyId, number,
    programId: bodyProgramId, specialty, batchSectionId, academicYearId, semesterId,
  } = req.body;
  const isDean = req.user?.role === 'DEAN';
  // Deans may only add lecturers to their own faculty (no extra affiliations/courses).
  const courseIds = isDean ? [] : req.body.courseIds;
  const secondaryFacultyId = isDean ? undefined : req.body.secondaryFacultyId;

  const role = normalizeRoleName(rawRole);
  if (isDean && role !== 'TEACHER') {
    throw new HttpError(403, 'Deans can only create lecturer accounts.', null);
  }
  const roleObj = await prisma.role.findUnique({ where: { name: role } });
  if (!roleObj) throw new HttpError(400, `Role '${role || rawRole}' does not exist`, null);

  if (role === 'DEAN' && !bodyFacultyId && !departmentCode) {
    throw new HttpError(400, 'Select a faculty for the new dean.', null);
  }

  if (role === 'STUDENT' && !departmentCode && !batchSectionId) {
    throw new HttpError(
      400,
      'Students require a department and batch section enrollment.',
      null
    );
  }

  if (role === 'STUDENT' && batchSectionId && (!academicYearId || !semesterId)) {
    throw new HttpError(
      400,
      'Student enrollment requires academicYearId and semesterId with batchSectionId.',
      null
    );
  }

  let facultyId = null;
  let departmentId = null;
  let programId = bodyProgramId ? Number(bodyProgramId) : null;

  if (role === 'DEAN' && bodyFacultyId) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: Number(bodyFacultyId) },
    });
    if (!faculty) throw new HttpError(400, 'Selected faculty was not found.', null);
    facultyId = faculty.id;
  } else if (departmentCode) {
    const resolved = await resolveDepartmentAndFaculty(departmentCode);
    facultyId = resolved.facultyId;
    departmentId = resolved.departmentId;
  }

  if (role === 'STUDENT' && batchSectionId) {
    const section = await prisma.batchSection.findUnique({
      where: { id: Number(batchSectionId) },
      include: {
        batch: {
          include: {
            program: { include: { department: true } },
          },
        },
      },
    });
    if (!section) throw new HttpError(400, 'Selected batch section was not found.', null);

    const program = section.batch?.program;
    const department = program?.department;
    if (!program || !department) {
      throw new HttpError(400, 'Section batch is missing program/department.', null);
    }

    programId = program.id;
    departmentId = department.id;
    facultyId = department.facultyId;

    if (departmentCode && department.code.toUpperCase() !== String(departmentCode).toUpperCase()) {
      throw new HttpError(
        400,
        `Department ${departmentCode} does not match section program department (${department.code}).`,
        null
      );
    }
  }

  if (role === 'STUDENT' && (!facultyId || !departmentId || !programId)) {
    throw new HttpError(
      400,
      'Could not resolve student faculty, department, and program. Pick a department and section.',
      null
    );
  }

  if (isDean && facultyId !== req.facultyId) {
    throw new HttpError(403, 'You can only create lecturers in your own faculty.', null);
  }

  if (role === 'TEACHER' && (!facultyId || !departmentId)) {
    throw new HttpError(400, 'departmentCode is required for this role.', null);
  }

  let universityId = typeof number === 'string' ? number.trim() : '';
  if (!universityId) {
    universityId = await generateUniversityId({
      role,
      batchSectionId,
      departmentCode,
      facultyId: bodyFacultyId || facultyId,
    });
  }

  await assertUserRegistrationAllowed({
    email,
    number: universityId,
    role,
    facultyId,
  });
  const password_hash = await hashPassword(password);

  const user = await prisma.user.create({
    data: buildUserCreateData({
      full_name, email, number: universityId, password_hash, roleId: roleObj.id, role,
      facultyId, departmentId, programId, specialty,
      batchSectionId, academicYearId, semesterId, courseIds, secondaryFacultyId,
    }),
    include: {
      role: { select: { name: true } },
      studentProfile: true,
      lecturerProfile: true,
      deanProfile: true,
    },
  });

  if (role === 'DEAN' && facultyId) {
    await prisma.faculty.update({
      where: { id: facultyId },
      data: { deanId: user.id },
    });
  }

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
      },
    },
  });
}
