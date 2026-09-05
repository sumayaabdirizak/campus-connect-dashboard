import { prisma } from '../../../db/prisma.js';
import { getAcademicInfoSystemAdapter } from './index.js';
import {
  extractUniversityStudentFields,
  resolveRegistrationTermsForStudent,
} from './resolveAisSyncScope.js';

export function formatUniversityAcademicYear(label) {
  const raw = String(label ?? '').trim();
  if (!raw) return null;
  return raw.replace(/-/g, '/');
}

export function buildUniversityAcademicLabel(academicYear, semesterNumber) {
  const year = formatUniversityAcademicYear(academicYear);
  if (year && semesterNumber != null && Number(semesterNumber) > 0) {
    return `${year} Semester ${semesterNumber}`;
  }
  if (year) return year;
  if (semesterNumber != null && Number(semesterNumber) > 0) {
    return `Semester ${semesterNumber}`;
  }
  return null;
}

/**
 * Cached university academic fields; optionally refresh from AIS on each read.
 */
export async function loadUniversityAcademicFields(studentProfile, { refresh = false } = {}) {
  const cached = {
    academicYear: formatUniversityAcademicYear(studentProfile.universityAcademicYear),
    semesterNumber: studentProfile.universitySemesterNumber ?? null,
    label: buildUniversityAcademicLabel(
      studentProfile.universityAcademicYear,
      studentProfile.universitySemesterNumber
    ),
  };

  const adapter = getAcademicInfoSystemAdapter();
  const shouldFetch =
    refresh ||
    !cached.academicYear ||
    cached.semesterNumber == null;

  if (!shouldFetch || !adapter?.fetchStudentAcademicStanding || !studentProfile.student_number) {
    return cached;
  }

  try {
    const standing = await adapter.fetchStudentAcademicStanding(
      studentProfile.student_number
    );
    const fields = extractUniversityStudentFields({
      academicYearLabel: standing?.AcademicYear || standing?.Status_AcademicYear,
      semesterNumber: standing?.Semester,
    });

    if (!fields.academicYearLabel && fields.semesterNumber == null) {
      return cached;
    }

    await prisma.studentProfile.update({
      where: { id: studentProfile.id },
      data: {
        universityAcademicYear: fields.academicYearLabel,
        universitySemesterNumber: fields.semesterNumber,
      },
    });

    return {
      academicYear: formatUniversityAcademicYear(fields.academicYearLabel),
      semesterNumber: fields.semesterNumber,
      label: buildUniversityAcademicLabel(
        fields.academicYearLabel,
        fields.semesterNumber
      ),
    };
  } catch {
    return cached;
  }
}

export function buildBatchSemesterLabel(semesterNumber) {
  const n = Number(semesterNumber);
  if (!Number.isFinite(n) || n < 1) return null;
  return `Semester ${n}`;
}

/** Curriculum semester from the student's batch (`Batch.semester_number`). */
export async function loadBatchSemesterForUserId(userId) {
  const registration = await prisma.studentRegistration.findFirst({
    where: { studentId: Number(userId) },
    orderBy: { created_at: 'desc' },
    include: {
      batchSection: {
        include: { batch: { select: { name: true, semester_number: true } } },
      },
    },
  });

  const number = registration?.batchSection?.batch?.semester_number ?? null;
  return {
    number: number != null && number > 0 ? number : null,
    batch: registration?.batchSection?.batch?.name ?? null,
    label: buildBatchSemesterLabel(number),
  };
}

export async function loadUniversityAcademicForUserId(userId, options = {}) {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: Number(userId) },
  });
  if (!studentProfile) return null;
  return loadUniversityAcademicFields(studentProfile, options);
}

/**
 * Map university academic display fields to local academic year + semester IDs for offerings.
 */
export async function resolveOfferingTermFromUniversity(universityAcademic) {
  if (!universityAcademic) return null;

  const rawYear =
    universityAcademic.academicYear?.replace(/\//g, '-') ??
    universityAcademic.academicYearLabel ??
    null;
  const semesterNumber = universityAcademic.semesterNumber;

  if (!rawYear && semesterNumber == null) return null;

  return resolveRegistrationTermsForStudent({
    academicYearLabel: rawYear,
    semesterNumber,
  });
}
