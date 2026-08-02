/**
 * Bulk student registration for SUPER_ADMIN.
 * Shared enrollment (section/year/semester) + per-row name/email.
 */
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../../utils/password.js';
import { HttpError } from '../../utils/httpError.js';
import { generateUniversityId } from '../../services/auth/generateUniversityId.js';
import { syncDiscussionMembershipsForUser } from '../../services/discussions/membershipSync.service.js';
import { buildUserCreateData } from './users.registration.js';

const MAX_ROWS = 200;

async function resolveStudentEnrollment(batchSectionId) {
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

  return {
    programId: program.id,
    departmentId: department.id,
    facultyId: department.facultyId,
  };
}

export async function registerStudentsBulk(req, res) {
  const {
    students,
    password: sharedPassword,
    batchSectionId,
    academicYearId,
    semesterId,
  } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    throw new HttpError(400, 'Provide at least one student row.', null);
  }
  if (students.length > MAX_ROWS) {
    throw new HttpError(400, `Maximum ${MAX_ROWS} students per import.`, null);
  }
  if (!batchSectionId || !academicYearId || !semesterId) {
    throw new HttpError(
      400,
      'batchSectionId, academicYearId, and semesterId are required.',
      null
    );
  }
  if (!sharedPassword || String(sharedPassword).length < 8) {
    throw new HttpError(400, 'Default password must be at least 8 characters.', null);
  }

  const roleObj = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
  if (!roleObj) throw new HttpError(400, "Role 'STUDENT' does not exist", null);

  const { programId, departmentId, facultyId } =
    await resolveStudentEnrollment(batchSectionId);

  const password_hash = await hashPassword(String(sharedPassword));
  const created = [];
  const errors = [];

  for (const row of students) {
    const full_name = String(row?.full_name || '').trim();
    const email = String(row?.email || '').trim().toLowerCase();

    if (!full_name || !email) {
      errors.push({ email: email || null, full_name, message: 'Name and email are required' });
      continue;
    }

    try {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        errors.push({ email, full_name, message: 'Email already registered' });
        continue;
      }

      const number = await generateUniversityId({
        role: 'STUDENT',
        batchSectionId,
      });

      const user = await prisma.user.create({
        data: buildUserCreateData({
          full_name,
          email,
          number,
          password_hash,
          roleId: roleObj.id,
          role: 'STUDENT',
          facultyId,
          departmentId,
          programId,
          batchSectionId,
          academicYearId,
          semesterId,
        }),
        select: { id: true, full_name: true, email: true, number: true },
      });

      try {
        await syncDiscussionMembershipsForUser(user.id);
      } catch (err) {
        console.error('Bulk student discussion sync failed', {
          userId: user.id,
          error: err?.message,
        });
      }

      created.push(user);
    } catch (err) {
      errors.push({
        email,
        full_name,
        message: err?.message || 'Failed to create student',
      });
    }
  }

  return res.status(created.length ? 201 : 400).json({
    message: `Created ${created.length} of ${students.length} students`,
    created,
    errors,
  });
}
