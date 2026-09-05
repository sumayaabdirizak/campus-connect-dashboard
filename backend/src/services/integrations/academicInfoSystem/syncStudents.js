import { prisma } from '../../../db/prisma.js';
import { env } from '../../../config/env.js';
import { hashPassword } from '../../../utils/password.js';
import { syncDiscussionMembershipsForUser } from '../../discussions/membershipSync.service.js';
import { getAcademicInfoSystemAdapter } from './index.js';
import {
  matchBatchSection,
  resolveAisBatchScope,
  ensureAisLocalStructure,
  deriveBatchMetaFromStudents,
  applyBatchCohortFromAdmission,
  inferAdmissionYearFromBatchCode,
  ensureBatchSectionsFromStudentRoster,
  extractUniversityStudentFields,
  resolveRegistrationTermsForStudent,
} from './resolveAisSyncScope.js';

function aisEnrollmentStatus(statusLabel) {
  const s = String(statusLabel ?? '').toLowerCase();
  if (s.includes('graduat')) return 'GRADUATED';
  if (s.includes('withdraw') || s.includes('inactive') || s.includes('suspend')) {
    return 'INACTIVE';
  }
  return 'ACTIVE';
}

function admissionYearFromRecord(record) {
  const entry = record.entryDate ? String(record.entryDate) : '';
  const year = Number.parseInt(entry.slice(0, 4), 10);
  if (Number.isFinite(year) && year > 1980) return year;
  return new Date().getFullYear();
}

async function resolveUniversityFieldsForStudent(adapter, row, studentNumber, deanToken) {
  const base = extractUniversityStudentFields(row);
  if (base.academicYearLabel && base.semesterNumber != null) return base;
  if (!deanToken || !adapter?.fetchStudentAcademicStanding) return base;

  try {
    const standing = await adapter.fetchStudentAcademicStanding(studentNumber, deanToken);
    const fromStanding = extractUniversityStudentFields({
      academicYearLabel: standing?.AcademicYear || standing?.Status_AcademicYear,
      semesterNumber: standing?.Semester,
    });
    return {
      academicYearLabel: base.academicYearLabel || fromStanding.academicYearLabel,
      semesterNumber: base.semesterNumber ?? fromStanding.semesterNumber,
    };
  } catch {
    return base;
  }
}

async function resolveDeanToken(adapter) {
  if (!adapter?.getDeanSession) return null;
  try {
    const session = await adapter.getDeanSession();
    return session?.token ?? null;
  } catch {
    return null;
  }
}

/** Unique placeholder when AIS row has no email. */
export function buildSyncEmail(studentNumber) {
  const safe = String(studentNumber)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `sis+${safe || 'student'}@campus-connect.internal`;
}

async function fetchAllAisStudents(adapter, fetchOpts) {
  const limit = fetchOpts.limit ?? 200;
  let offset = fetchOpts.offset ?? 0;
  const all = [];
  let pages = 0;
  const maxPages = 100;

  while (pages < maxPages) {
    const page = await adapter.fetchStudents({ ...fetchOpts, limit, offset });
    if (!page.length) break;
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
    pages += 1;
  }

  return all;
}

/**
 * Upsert students from university AIS into Campus Connect.
 *
 * @param {object} opts
 * @param {number} opts.facultyId — external AIS faculty id (dean API)
 * @param {number} opts.departmentId — external AIS department id
 * @param {string} opts.batch — AIS batch code
 * @param {number} [opts.localDepartmentId] — Campus Connect department
 * @param {number} [opts.localProgramId]
 * @param {number} [opts.localBatchId]
 * @param {string} [opts.status] — active | graduated | all
 * @param {boolean} [opts.dryRun]
 */
export async function syncStudentsFromAis(opts = {}) {
  const {
    facultyId,
    departmentId,
    batch,
    localDepartmentId,
    localProgramId,
    localBatchId,
    status = 'active',
    dryRun = false,
  } = opts;

  if (!facultyId || !departmentId || !batch) {
    throw new Error('facultyId, departmentId, and batch are required');
  }

  const defaultPassword = env.UNIVERSITY_SYNC_DEFAULT_PASSWORD;
  if (!dryRun && !defaultPassword) {
    throw new Error(
      'Set UNIVERSITY_SYNC_DEFAULT_PASSWORD (min 8 chars) for new synced students'
    );
  }
  if (!dryRun && String(defaultPassword).length < 8) {
    throw new Error('UNIVERSITY_SYNC_DEFAULT_PASSWORD must be at least 8 characters');
  }

  const adapter = getAcademicInfoSystemAdapter();
  const externalStudents = await fetchAllAisStudents(adapter, {
    facultyId: Number(facultyId),
    departmentId: Number(departmentId),
    batch: String(batch),
    status,
  });

  const scope = await resolveAisBatchScope({
    batchCode: batch,
    localDepartmentId,
    localProgramId,
    localBatchId,
  });

  scope.sections = await ensureBatchSectionsFromStudentRoster(
    scope.batch.id,
    externalStudents,
    { dryRun }
  );

  const batchMeta = deriveBatchMetaFromStudents(externalStudents, batch);
  if (!dryRun && batchMeta.admissionYear) {
    await applyBatchCohortFromAdmission(
      scope.batch.id,
      batchMeta.admissionYear,
      scope.program.durationYears ?? 4
    );
    const refreshed = await prisma.batch.findUnique({
      where: { id: scope.batch.id },
      include: {
        program: { include: { department: true } },
        sections: { select: { id: true, name: true } },
      },
    });
    if (refreshed) {
      scope.batch = refreshed;
    }
  }

  const studentRole = await prisma.role.findUnique({ where: { name: 'STUDENT' } });
  if (!studentRole) {
    throw new Error('STUDENT role is missing in database');
  }

  const password_hash = dryRun ? null : await hashPassword(String(defaultPassword));

  const summary = {
    dryRun,
    fetched: externalStudents.length,
    created: 0,
    updated: 0,
    registrationsUpdated: 0,
    skipped: 0,
    errors: [],
    scope: {
      batchId: scope.batch.id,
      batchName: scope.batch.name,
      programId: scope.program.id,
      departmentId: scope.department.id,
      facultyId: scope.facultyId,
    },
  };

  const discussionSyncUserIds = [];
  const deanToken = await resolveDeanToken(adapter);

  for (const row of externalStudents) {
    const studentNumber = String(row.studentNumber || row.externalId || '').trim();
    if (!studentNumber) {
      summary.skipped += 1;
      summary.errors.push({ studentNumber: null, message: 'Missing StudentID' });
      continue;
    }

    const fullName = String(row.fullName || '').trim() || studentNumber;
    const emailRaw = row.email ? String(row.email).trim().toLowerCase() : '';
    const email = emailRaw || buildSyncEmail(studentNumber);
    const enrollmentStatus = aisEnrollmentStatus(row.status);
    const section = matchBatchSection(scope.sections, row.section);
    if (!section) {
      summary.skipped += 1;
      summary.errors.push({
        studentNumber,
        message: `No section on batch ${scope.batch.name}`,
      });
      continue;
    }

    try {
      const universityFields = await resolveUniversityFieldsForStudent(
        adapter,
        row,
        studentNumber,
        deanToken
      );
      const studentTerms = await resolveRegistrationTermsForStudent({
        ...row,
        academicYearLabel: universityFields.academicYearLabel,
        semesterNumber: universityFields.semesterNumber,
      });

      const existingProfile = await prisma.studentProfile.findUnique({
        where: { student_number: studentNumber },
        include: { user: { select: { id: true, email: true, full_name: true } } },
      });

      if (dryRun) {
        if (existingProfile) summary.updated += 1;
        else summary.created += 1;
        summary.registrationsUpdated += 1;
        continue;
      }

      let userId;

      if (existingProfile) {
        userId = existingProfile.userId;

        const emailConflict = await prisma.user.findFirst({
          where: { email, NOT: { id: userId } },
          select: { id: true },
        });
        const userUpdate = { full_name: fullName };
        if (!emailConflict && emailRaw) {
          userUpdate.email = email;
        }

        await prisma.user.update({ where: { id: userId }, data: userUpdate });

        await prisma.studentProfile.update({
          where: { id: existingProfile.id },
          data: {
            facultyId: scope.facultyId,
            departmentId: scope.department.id,
            programId: scope.program.id,
            admission_year: admissionYearFromRecord(row),
            universityAcademicYear: universityFields.academicYearLabel,
            universitySemesterNumber: universityFields.semesterNumber,
          },
        });

        if (enrollmentStatus === 'GRADUATED') {
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' },
          });
        }

        summary.updated += 1;
      } else {
        const numberConflict = await prisma.user.findUnique({
          where: { number: studentNumber },
          select: { id: true },
        });
        if (numberConflict) {
          summary.skipped += 1;
          summary.errors.push({
            studentNumber,
            message: 'University ID already used by another account',
          });
          continue;
        }

        const emailConflict = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (emailConflict) {
          summary.skipped += 1;
          summary.errors.push({ studentNumber, message: `Email ${email} already in use` });
          continue;
        }

        const user = await prisma.user.create({
          data: {
            full_name: fullName,
            email,
            number: studentNumber,
            password_hash,
            roleId: studentRole.id,
            must_change_password: true,
            studentProfile: {
              create: {
                student_number: studentNumber,
                admission_year: admissionYearFromRecord(row),
                facultyId: scope.facultyId,
                departmentId: scope.department.id,
                programId: scope.program.id,
                universityAcademicYear: universityFields.academicYearLabel,
                universitySemesterNumber: universityFields.semesterNumber,
              },
            },
          },
          select: { id: true },
        });
        userId = user.id;
        summary.created += 1;
      }

      const existingReg = await prisma.studentRegistration.findFirst({
        where: { studentId: userId, batchSectionId: section.id },
        select: { id: true },
      });

      if (!existingReg) {
        await prisma.studentRegistration.deleteMany({
          where: {
            studentId: userId,
            batchSectionId: { not: section.id },
          },
        });

        await prisma.studentRegistration.create({
          data: {
            studentId: userId,
            batchSectionId: section.id,
            ...studentTerms,
            status: enrollmentStatus,
            graduatedAt: enrollmentStatus === 'GRADUATED' ? new Date() : null,
          },
        });
      } else {
        await prisma.studentRegistration.update({
          where: { id: existingReg.id },
          data: {
            currentAcademicYearId: studentTerms.currentAcademicYearId,
            currentSemesterId: studentTerms.currentSemesterId,
            registrationAcademicYearId: studentTerms.registrationAcademicYearId,
            status: enrollmentStatus,
            ...(enrollmentStatus === 'GRADUATED' ? { graduatedAt: new Date() } : {}),
          },
        });
      }

      summary.registrationsUpdated += 1;
      discussionSyncUserIds.push(userId);
    } catch (err) {
      summary.skipped += 1;
      summary.errors.push({
        studentNumber,
        message: err?.message || 'Sync failed',
      });
    }
  }

  if (!dryRun && discussionSyncUserIds.length) {
    for (const id of discussionSyncUserIds) {
      try {
        await syncDiscussionMembershipsForUser(id);
      } catch (err) {
        console.error('Discussion sync after AIS student sync failed', {
          userId: id,
          error: err?.message,
        });
      }
    }
  }

  return summary;
}

function aggregateSummary(totals, batchSummary) {
  totals.fetched += batchSummary.fetched;
  totals.created += batchSummary.created;
  totals.updated += batchSummary.updated;
  totals.registrationsUpdated += batchSummary.registrationsUpdated;
  totals.skipped += batchSummary.skipped;
  totals.errors.push(...batchSummary.errors);
}

/**
 * Sync all active batches under every department in an AIS faculty.
 *
 * @param {object} opts
 * @param {number} opts.facultyId — external AIS faculty id
 * @param {string} [opts.status] — active | graduated | all
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.facultyCode] — local faculty code override (e.g. EMS)
 * @param {string} [opts.facultyName] — local faculty name override
 */
export async function syncFacultyStudentsFromAis(opts = {}) {
  const {
    facultyId,
    status = 'active',
    dryRun = false,
    facultyCode,
    facultyName,
  } = opts;

  if (!facultyId) {
    throw new Error('facultyId is required');
  }

  const adapter = getAcademicInfoSystemAdapter();
  const departments = await adapter.listDepartments(Number(facultyId));
  if (!departments.length) {
    return {
      dryRun,
      facultyId: Number(facultyId),
      departmentsProcessed: 0,
      batchesProcessed: 0,
      fetched: 0,
      created: 0,
      updated: 0,
      registrationsUpdated: 0,
      skipped: 0,
      errors: [],
      batches: [],
      message: 'No departments returned for this faculty',
    };
  }

  let resolvedFacultyName = facultyName;
  let resolvedFacultyCode = facultyCode;
  if (!resolvedFacultyName || !resolvedFacultyCode) {
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
  }
  resolvedFacultyCode = resolvedFacultyCode ?? `AIS${facultyId}`;
  resolvedFacultyName = resolvedFacultyName ?? `Faculty ${facultyId}`;

  const totals = {
    dryRun,
    facultyId: Number(facultyId),
    facultyCode: resolvedFacultyCode,
    facultyName: resolvedFacultyName,
    departmentsProcessed: 0,
    batchesProcessed: 0,
    fetched: 0,
    created: 0,
    updated: 0,
    registrationsUpdated: 0,
    skipped: 0,
    errors: [],
    batches: [],
  };

  for (const dept of departments) {
    const externalDeptId = Number(dept.id ?? dept.departmentId ?? dept.DeptId);
    if (!externalDeptId) continue;

    const deptName = dept.DeptName ?? dept.name ?? `Department ${externalDeptId}`;
    const deptCode = dept.DeptID ?? dept.code ?? deptName;
    const programName = dept.Program ?? dept.program ?? deptName;

    let aisBatches = [];
    try {
      aisBatches = await adapter.listBatches(Number(facultyId), externalDeptId);
    } catch (err) {
      totals.errors.push({
        departmentId: externalDeptId,
        batch: null,
        message: `Failed to list batches: ${err.message}`,
      });
      continue;
    }

    if (!aisBatches.length) continue;
    totals.departmentsProcessed += 1;

    for (const batchRow of aisBatches) {
      const batchCode = String(
        batchRow.BatchCode ?? batchRow.batch ?? batchRow.batchCode ?? ''
      ).trim();
      if (!batchCode) continue;

      try {
        const local = await ensureAisLocalStructure({
          facultyName: resolvedFacultyName,
          facultyCode: resolvedFacultyCode,
          departmentName: deptName,
          departmentCode: deptCode,
          programName,
          batchCode,
          admissionYear: inferAdmissionYearFromBatchCode(batchCode),
        });

        const batchSummary = await syncStudentsFromAis({
          facultyId: Number(facultyId),
          departmentId: externalDeptId,
          batch: batchCode,
          localDepartmentId: local.localDepartmentId,
          localProgramId: local.localProgramId,
          localBatchId: local.localBatchId,
          status,
          dryRun,
        });

        totals.batchesProcessed += 1;
        aggregateSummary(totals, batchSummary);
        totals.batches.push({
          departmentId: externalDeptId,
          departmentName: deptName,
          batchCode,
          localDepartmentId: local.localDepartmentId,
          localBatchId: local.localBatchId,
          ...batchSummary,
        });
      } catch (err) {
        totals.skipped += 1;
        totals.errors.push({
          departmentId: externalDeptId,
          batch: batchCode,
          message: err?.message || 'Batch sync failed',
        });
        totals.batches.push({
          departmentId: externalDeptId,
          departmentName: deptName,
          batchCode,
          error: err?.message || 'Batch sync failed',
        });
      }
    }
  }

  return totals;
}
