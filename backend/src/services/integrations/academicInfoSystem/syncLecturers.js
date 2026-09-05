import { prisma } from '../../../db/prisma.js';
import { env } from '../../../config/env.js';
import { hashPassword } from '../../../utils/password.js';
import { syncDiscussionMembershipsForUser } from '../../discussions/membershipSync.service.js';
import { getAcademicInfoSystemAdapter } from './index.js';
import {
  findLocalBatchByCode,
  resolveAcademicYearByLabel,
  resolveLocalDepartmentByAisMeta,
  resolveSemesterForYear,
} from './resolveAisSyncScope.js';

/** Campus Connect login id for an AIS lecturer employee id. */
export function buildLecturerSyncNumber(aisId) {
  return `L-${String(aisId).trim()}`;
}

export function buildLecturerSyncEmail(aisId) {
  return `lecturer+${String(aisId).trim()}@campus-connect.internal`;
}

async function resolveLocalFacultyId(facultyCode, facultyName) {
  if (facultyCode) {
    const hit = await prisma.faculty.findFirst({
      where: { code: { equals: String(facultyCode).trim(), mode: 'insensitive' } },
      select: { id: true },
    });
    if (hit) return hit.id;
  }
  if (facultyName) {
    const hit = await prisma.faculty.findFirst({
      where: { name: { equals: String(facultyName).trim(), mode: 'insensitive' } },
      select: { id: true },
    });
    if (hit) return hit.id;
  }
  return null;
}

async function defaultDepartmentForFaculty(localFacultyId) {
  return prisma.department.findFirst({
    where: { facultyId: Number(localFacultyId) },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
}

async function upsertLecturerFacultyLink(lecturerProfileId, facultyId) {
  await prisma.lecturerFaculty.upsert({
    where: {
      lecturerProfileId_facultyId: {
        lecturerProfileId,
        facultyId,
      },
    },
    create: { lecturerProfileId, facultyId },
    update: {},
  });
}

async function upsertTeacherCourseAssigning(teacherId, courseId, summary) {
  const existing = await prisma.teacherAssigning.findUnique({
    where: {
      teacherId_courseId: { teacherId, courseId },
    },
    select: { id: true },
  });
  if (existing) {
    summary.teacherAssigningsAlready += 1;
    return;
  }
  await prisma.teacherAssigning.create({
    data: { teacherId, courseId },
  });
  summary.teacherAssigningsCreated += 1;
}

async function assignTeacherOfferings(userId, courseRows, localFacultyId, summary) {
  for (const row of courseRows) {
    const code = row.code;
    const batchCode = row.batchCode ? String(row.batchCode).trim() : '';
    if (!code) {
      summary.offeringsSkipped += 1;
      continue;
    }

    const course = await prisma.course.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!course) {
      summary.offeringsSkipped += 1;
      continue;
    }

    await upsertTeacherCourseAssigning(userId, course.id, summary);

    if (!batchCode) {
      summary.offeringsSkipped += 1;
      continue;
    }

    const localBatch = await findLocalBatchByCode(batchCode);
    if (!localBatch?.sections?.length) {
      summary.offeringsSkipped += 1;
      if (batchCode) {
        summary.errors.push({
          lecturerId: userId,
          code,
          message: `No local batch/sections for ${batchCode}`,
        });
      }
      continue;
    }

    const academicYear = await resolveAcademicYearByLabel(row.academicYearLabel);
    if (!academicYear) {
      summary.offeringsSkipped += 1;
      continue;
    }

    const semester = await resolveSemesterForYear(
      academicYear.id,
      row.semesterNumber ?? 1
    );
    if (!semester) {
      summary.offeringsSkipped += 1;
      continue;
    }

    for (const section of localBatch.sections) {
      const offering = await prisma.courseOffering.findFirst({
        where: {
          courseId: course.id,
          sectionId: section.id,
          semesterId: semester.id,
          academicYearId: academicYear.id,
        },
        select: { id: true, teacherId: true },
      });

      if (!offering) {
        summary.offeringsSkipped += 1;
        continue;
      }

      if (offering.teacherId === userId) {
        summary.offeringsAlreadyAssigned += 1;
        continue;
      }

      await prisma.courseOffering.update({
        where: { id: offering.id },
        data: { teacherId: userId },
      });
      summary.offeringsAssigned += 1;
    }
  }
}

/**
 * Sync lecturers from university AIS into Campus Connect (TEACHER users).
 *
 * @param {object} opts
 * @param {number} opts.facultyId — external AIS faculty id
 * @param {number} [opts.departmentId] — optional AIS department filter
 * @param {string} [opts.facultyCode] — local faculty code (e.g. EMS)
 * @param {string} [opts.facultyName]
 * @param {boolean} [opts.assignOfferings] — link lecturer-courses → CourseOffering.teacherId
 * @param {boolean} [opts.dryRun]
 */
export async function syncFacultyLecturersFromAis(opts = {}) {
  const {
    facultyId,
    departmentId,
    facultyCode,
    facultyName,
    assignOfferings = true,
    dryRun = false,
  } = opts;

  if (!facultyId) {
    throw new Error('facultyId is required');
  }

  const defaultPassword = env.UNIVERSITY_SYNC_DEFAULT_PASSWORD;
  if (!dryRun && !defaultPassword) {
    throw new Error(
      'Set UNIVERSITY_SYNC_DEFAULT_PASSWORD (min 8 chars) for new synced lecturers'
    );
  }
  if (!dryRun && String(defaultPassword).length < 8) {
    throw new Error('UNIVERSITY_SYNC_DEFAULT_PASSWORD must be at least 8 characters');
  }

  const adapter = getAcademicInfoSystemAdapter();
  const externalLecturers = await adapter.fetchLecturers({
    facultyId: Number(facultyId),
    departmentId: departmentId ? Number(departmentId) : undefined,
  });

  let resolvedFacultyName = facultyName;
  let resolvedFacultyCode = facultyCode;
  try {
    const session = await adapter.getDeanSession();
    const faculties = session.login.allowedFaculties ?? [];
    const match = faculties.find((f) => Number(f.id ?? f.facultyId) === Number(facultyId));
    if (match) {
      resolvedFacultyName = resolvedFacultyName ?? match.name ?? match.FacName;
      resolvedFacultyCode =
        resolvedFacultyCode ?? match.code ?? match.FacCode ?? `AIS${facultyId}`;
    }
  } catch {
    // optional metadata
  }
  resolvedFacultyCode = resolvedFacultyCode ?? `AIS${facultyId}`;
  resolvedFacultyName = resolvedFacultyName ?? `Faculty ${facultyId}`;

  const localFacultyId = await resolveLocalFacultyId(resolvedFacultyCode, resolvedFacultyName);
  if (!localFacultyId) {
    throw new Error(
      `Local faculty not found for code=${resolvedFacultyCode}. Sync structure/students first.`
    );
  }

  const defaultDept = await defaultDepartmentForFaculty(localFacultyId);
  if (!defaultDept) {
    throw new Error(`No local departments for faculty id ${localFacultyId}`);
  }

  const teacherRole = await prisma.role.findUnique({ where: { name: 'TEACHER' } });
  if (!teacherRole) {
    throw new Error('TEACHER role is missing in database');
  }

  const password_hash = dryRun ? null : await hashPassword(String(defaultPassword));

  const summary = {
    dryRun,
    facultyId: Number(facultyId),
    facultyCode: resolvedFacultyCode,
    facultyName: resolvedFacultyName,
    localFacultyId,
    fetched: externalLecturers.length,
    created: 0,
    updated: 0,
    offeringsAssigned: 0,
    offeringsAlreadyAssigned: 0,
    offeringsSkipped: 0,
    teacherAssigningsCreated: 0,
    teacherAssigningsAlready: 0,
    skipped: 0,
    errors: [],
  };

  const discussionSyncUserIds = [];

  for (const row of externalLecturers) {
    const aisId = String(row.externalId ?? '').trim();
    if (!aisId) {
      summary.skipped += 1;
      continue;
    }

    const fullName = String(row.fullName || '').trim() || `Lecturer ${aisId}`;
    const number = buildLecturerSyncNumber(aisId);
    const email = buildLecturerSyncEmail(aisId);

    try {
      const existingUser = await prisma.user.findUnique({
        where: { number },
        include: { lecturerProfile: { select: { id: true, departmentId: true } } },
      });

      if (dryRun) {
        if (existingUser) summary.updated += 1;
        else summary.created += 1;
        if (assignOfferings && adapter.fetchLecturerCourses) {
          const courses = await adapter.fetchLecturerCourses(aisId);
          summary.courseLinksFound = (summary.courseLinksFound ?? 0) + courses.length;
        }
        continue;
      }

      let userId;
      let lecturerProfileId;

      if (existingUser) {
        userId = existingUser.id;
        await prisma.user.update({
          where: { id: userId },
          data: { full_name: fullName },
        });

        if (existingUser.lecturerProfile) {
          lecturerProfileId = existingUser.lecturerProfile.id;
        } else {
          const lp = await prisma.lecturerProfile.create({
            data: {
              userId,
              departmentId: defaultDept.id,
              specialty: row.gender ? `${row.gender}` : null,
            },
            select: { id: true },
          });
          lecturerProfileId = lp.id;
        }
        summary.updated += 1;
      } else {
        const emailConflict = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (emailConflict) {
          summary.skipped += 1;
          summary.errors.push({
            lecturerId: aisId,
            message: `Email ${email} already in use`,
          });
          continue;
        }

        const user = await prisma.user.create({
          data: {
            full_name: fullName,
            email,
            number,
            password_hash,
            roleId: teacherRole.id,
            must_change_password: true,
            lecturerProfile: {
              create: {
                departmentId: defaultDept.id,
                specialty: row.gender ? `${row.gender}` : null,
              },
            },
          },
          include: { lecturerProfile: { select: { id: true } } },
        });
        userId = user.id;
        lecturerProfileId = user.lecturerProfile.id;
        summary.created += 1;
      }

      await upsertLecturerFacultyLink(lecturerProfileId, localFacultyId);

      if (assignOfferings && adapter.fetchLecturerCourses) {
        const courseRows = await adapter.fetchLecturerCourses(aisId);
        if (courseRows.length) {
          const deptFromCourses = courseRows.find((c) => c.deptName);
          if (deptFromCourses?.deptName) {
            const dept = await resolveLocalDepartmentByAisMeta({
              localFacultyId,
              deptName: deptFromCourses.deptName,
            });
            if (dept) {
              await prisma.lecturerProfile.update({
                where: { id: lecturerProfileId },
                data: { departmentId: dept.id },
              });
            }
          }
          await assignTeacherOfferings(userId, courseRows, localFacultyId, summary);
        }
      }

      discussionSyncUserIds.push(userId);
    } catch (err) {
      summary.skipped += 1;
      summary.errors.push({
        lecturerId: aisId,
        message: err?.message || 'Sync failed',
      });
    }
  }

  if (!dryRun && discussionSyncUserIds.length) {
    for (const id of discussionSyncUserIds) {
      try {
        await syncDiscussionMembershipsForUser(id);
      } catch (err) {
        console.error('Discussion sync after AIS lecturer sync failed', {
          userId: id,
          error: err?.message,
        });
      }
    }
  }

  return summary;
}
