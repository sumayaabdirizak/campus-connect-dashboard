import { prisma } from '../../../db/prisma.js';
import {
  buildAcademicYearName,
  maxSemestersForDuration,
  parseAcademicYearStartYear,
} from '../../academic/academicCalendarDefaults.js';
import {
  buildAcademicYearBounds,
  buildDefaultSemesterRows,
  computeCohortSemester,
  getSemesterInYear,
} from '../../academic/academicCalendar.js';
import { getNextSemesterSequence } from '../../academic/semesterSequence.js';

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Match AIS section label (e.g. "A") to a local BatchSection name.
 * @param {Array<{ id: number; name: string }>} sections
 * @param {string|null|undefined} sectionLabel
 */
export function matchBatchSection(sections, sectionLabel) {
  if (!sections?.length) return null;
  const raw = String(sectionLabel ?? '').trim();
  if (!raw) return sections[0];

  const key = normalizeKey(raw);
  const candidates = [
    raw,
    `Section ${raw}`,
    `section ${raw}`,
    raw.toUpperCase(),
  ];

  for (const name of candidates) {
    const hit = sections.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
  }

  const byKey = sections.find((s) => normalizeKey(s.name).endsWith(key) || normalizeKey(s.name) === key);
  if (byKey) return byKey;

  return sections[0];
}

/** Canonical local BatchSection name for an AIS section label (e.g. "A" → "Section A"). */
export function sectionNameFromAisLabel(label) {
  const raw = String(label ?? '').trim();
  if (!raw) return 'Section A';
  if (raw.toLowerCase().startsWith('section ')) return raw;
  if (/^[a-z]$/i.test(raw) || /^\d+$/.test(raw)) {
    return `Section ${raw.toUpperCase()}`;
  }
  return raw;
}

/** Unique non-empty section labels from an AIS student roster page. */
export function collectAisSectionLabels(students) {
  const labels = new Set();
  for (const row of students ?? []) {
    const s = String(row.section ?? '').trim();
    if (s) labels.add(s);
  }
  return [...labels];
}

/**
 * Create/update batch sections from university student roster (not hardcoded A/B).
 * Removes empty legacy sections that are not on the roster when safe.
 */
export async function ensureBatchSectionsFromStudentRoster(batchId, students, opts = {}) {
  const { dryRun = false } = opts;
  const numericBatchId = Number(batchId);
  const labels = collectAisSectionLabels(students);
  const sectionNames =
    labels.length > 0 ? labels.map(sectionNameFromAisLabel) : ['Section A'];
  const rosterNameSet = new Set(sectionNames.map((n) => n.toLowerCase()));

  const existing = await prisma.batchSection.findMany({
    where: { batchId: numericBatchId },
    select: { id: true, name: true },
  });

  if (dryRun) {
    const existingNames = new Set(existing.map((s) => s.name.toLowerCase()));
    const merged = [...existing];
    for (const name of sectionNames) {
      if (!existingNames.has(name.toLowerCase())) {
        merged.push({ id: 0, name });
      }
    }
    return merged;
  }

  for (const name of sectionNames) {
    await prisma.batchSection.upsert({
      where: { batchId_name: { batchId: numericBatchId, name } },
      update: {},
      create: { name, batchId: numericBatchId },
    });
  }

  const allSections = await prisma.batchSection.findMany({
    where: { batchId: numericBatchId },
    include: {
      _count: { select: { studentRegistrations: true, courseOfferings: true } },
    },
  });

  for (const sec of allSections) {
    const onRoster = rosterNameSet.has(sec.name.toLowerCase());
    if (onRoster) continue;
    if (sec._count.studentRegistrations > 0) continue;

    if (sec._count.courseOfferings > 0) {
      await prisma.courseOffering.deleteMany({ where: { sectionId: sec.id } });
    }
    await prisma.batchSection.delete({ where: { id: sec.id } });
  }

  return prisma.batchSection.findMany({
    where: { batchId: numericBatchId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Resolve local batch (+ default section list) for an AIS batch code.
 */
export async function resolveAisBatchScope({
  batchCode,
  localDepartmentId,
  localProgramId,
  localBatchId,
}) {
  if (localBatchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: Number(localBatchId) },
      include: {
        program: { include: { department: true } },
        sections: { select: { id: true, name: true } },
      },
    });
    if (!batch) {
      throw new Error(`localBatchId ${localBatchId} not found`);
    }
    return {
      batch,
      program: batch.program,
      department: batch.program.department,
      facultyId: batch.program.department.facultyId,
      sections: batch.sections,
    };
  }

  if (!batchCode) {
    throw new Error('batch (AIS batch code) or localBatchId is required');
  }

  let programId = localProgramId ? Number(localProgramId) : null;
  if (!programId && localDepartmentId) {
    const programs = await prisma.program.findMany({
      where: { departmentId: Number(localDepartmentId) },
      select: { id: true, code: true, name: true },
    });
    if (programs.length === 0) {
      throw new Error(`No programs found for localDepartmentId ${localDepartmentId}`);
    }
    if (programs.length > 1 && !localProgramId) {
      throw new Error(
        `Department has ${programs.length} programs — pass localProgramId explicitly`
      );
    }
    programId = programs[0].id;
  }

  if (!programId) {
    throw new Error('localDepartmentId or localProgramId is required when localBatchId is omitted');
  }

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { department: true },
  });
  if (!program) {
    throw new Error(`Program ${programId} not found`);
  }

  const batches = await prisma.batch.findMany({
    where: { programId },
    include: { sections: { select: { id: true, name: true } } },
  });

  const codeKey = normalizeKey(batchCode);
  const batch =
    batches.find((b) => normalizeKey(b.name) === codeKey) ||
    batches.find((b) => normalizeKey(b.name).includes(codeKey)) ||
    batches.find((b) => b.name.toLowerCase() === String(batchCode).toLowerCase());

  if (!batch) {
    throw new Error(
      `No local batch matches AIS batch "${batchCode}" under program ${program.code}. ` +
        `Create the batch in Campus Connect or pass localBatchId.`
    );
  }

  return {
    batch,
    program,
    department: program.department,
    facultyId: program.department.facultyId,
    sections: batch.sections,
  };
}

/**
 * Infer cohort admission year from AIS batch codes (BF06 → 2006, 23-BA-01 → 2023).
 */
export function inferAdmissionYearFromBatchCode(batchCode) {
  const code = String(batchCode ?? '').trim();
  if (!code) return null;

  const hyphenLead = code.match(/^(\d{2,4})-/);
  if (hyphenLead) {
    const y = Number(hyphenLead[1]);
    if (y >= 1000) return y;
    if (y >= 0 && y <= 99) return 2000 + y;
  }

  const trailing = code.match(/(\d{2})$/);
  if (trailing) {
    const n = Number(trailing[1]);
    if (Number.isFinite(n) && n <= 40) return 2000 + n;
    if (Number.isFinite(n) && n <= 99) return 1900 + n;
  }

  return null;
}

/** Per-student academic year + curriculum semester from one AIS row. */
export function extractUniversityStudentFields(row) {
  if (!row) return { academicYearLabel: null, semesterNumber: null };

  const academicYearLabel =
    row.academicYearLabel ??
    row.AcademicYear ??
    row.Status_AcademicYear ??
    null;
  const semRaw = row.semesterNumber ?? row.Semester;
  const semesterNumber =
    semRaw != null && Number.isFinite(Number(semRaw)) ? Number(semRaw) : null;

  return {
    academicYearLabel: academicYearLabel ? String(academicYearLabel).trim() : null,
    semesterNumber,
  };
}

/** Batch-level university term — first roster row with an academic year label. */
export function extractUniversityTermFromStudents(students) {
  if (!Array.isArray(students) || !students.length) return null;

  for (const row of students) {
    const fields = extractUniversityStudentFields(row);
    if (fields.academicYearLabel) {
      return {
        academicYearLabel: fields.academicYearLabel,
        semesterNumber: fields.semesterNumber,
      };
    }
  }

  return null;
}

/**
 * Registration term for one student — academic year from AIS row;
 * term semester is First/Second when AIS Semester is 1–2, else calendar fallback.
 */
export async function resolveRegistrationTermsForStudent(row) {
  const { academicYearLabel, semesterNumber } = extractUniversityStudentFields(row);
  if (!academicYearLabel) {
    return resolveRegistrationTerms(null);
  }

  const termSemesterSeq =
    semesterNumber === 1 || semesterNumber === 2
      ? semesterNumber
      : getSemesterInYear();

  return resolveRegistrationTerms({
    academicYearLabel,
    semesterNumber: termSemesterSeq,
  });
}

/**
 * Cohort academic year + curriculum semester from admission (Sept entry policy).
 */
export async function computeCohortFieldsForAdmission(admissionYear, durationYears = 4) {
  if (!Number.isFinite(admissionYear) || admissionYear < 1980) {
    return null;
  }

  const cohortStartYear = admissionYear;
  const cohortAyLabel = buildAcademicYearName(cohortStartYear);
  const academicYear = await resolveAcademicYearByLabel(cohortAyLabel);
  const maxSemesters = maxSemestersForDuration(durationYears);
  const raw = computeCohortSemester(cohortStartYear);
  const cohortSemester = Math.min(raw, maxSemesters);

  return {
    cohortStartYear,
    cohortAyLabel,
    academicYearId: academicYear?.id ?? null,
    cohortSemester,
  };
}

/**
 * Update batch cohort progress (academic year of entry + curriculum semester).
 */
export async function applyBatchCohortFromAdmission(batchId, admissionYear, durationYears = 4) {
  const cohort = await computeCohortFieldsForAdmission(admissionYear, durationYears);
  if (!cohort?.academicYearId) return null;

  await prisma.batch.update({
    where: { id: Number(batchId) },
    data: {
      academic_year: cohort.cohortStartYear,
      academicYearId: cohort.academicYearId,
      semester_number: cohort.cohortSemester,
    },
  });

  return cohort;
}

/**
 * Derive admission year + university term from synced student roster.
 */
export function deriveBatchMetaFromStudents(students, batchCode) {
  const years = [];
  for (const row of students) {
    const entry = row.entryDate ? String(row.entryDate) : '';
    const y = Number.parseInt(entry.slice(0, 4), 10);
    if (Number.isFinite(y) && y > 1980) years.push(y);
    const admission = row.admissionYear;
    if (Number.isFinite(admission) && admission > 1980) years.push(admission);
  }

  const admissionYear =
    years.length > 0 ? Math.min(...years) : inferAdmissionYearFromBatchCode(batchCode);

  return {
    admissionYear,
    universityTerm: extractUniversityTermFromStudents(students),
  };
}

/**
 * Active registration term — current university term or academic calendar fallback.
 */
export async function resolveRegistrationTerms(universityTerm) {
  let academicYearId;
  let semesterId;

  if (universityTerm?.academicYearLabel) {
    const ay = await resolveAcademicYearByLabel(universityTerm.academicYearLabel);
    if (!ay) {
      throw new Error(
        `Academic year "${universityTerm.academicYearLabel}" not in database — seed academic years`
      );
    }
    academicYearId = ay.id;
    const seq = universityTerm.semesterNumber ?? getSemesterInYear();
    const semester = await resolveSemesterForYear(academicYearId, seq);
    if (!semester?.id) {
      throw new Error(`No semester sequence ${seq} for academic year ${ay.name}`);
    }
    semesterId = semester.id;
  } else {
    const { resolveActiveAcademicTerm } = await import('../../academic/resolveActiveAcademicTerm.js');
    const active = await resolveActiveAcademicTerm({ includeDb: true });
    if (!active.academicYearId || !active.semesterId) {
      throw new Error('No active academic year/semester in database — seed academic years first');
    }
    academicYearId = active.academicYearId;
    semesterId = active.semesterId;
  }

  return {
    registrationAcademicYearId: academicYearId,
    currentAcademicYearId: academicYearId,
    currentSemesterId: semesterId,
  };
}

function sanitizeCode(value, fallback = 'X') {
  const code = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9&]/g, '');
  return code || fallback;
}

/**
 * Create or update local faculty / department / program / batch for an AIS roster slice.
 * @returns {{ localFacultyId: number; localDepartmentId: number; localProgramId: number; localBatchId: number }}
 */
export async function ensureAisLocalStructure({
  facultyName,
  facultyCode,
  departmentName,
  departmentCode,
  programName,
  batchCode,
  admissionYear,
}) {
  const fCode = sanitizeCode(facultyCode, 'FAC');
  const faculty = await prisma.faculty.upsert({
    where: { code: fCode },
    update: { name: facultyName || fCode },
    create: {
      code: fCode,
      name: facultyName || fCode,
      defaultDurationYears: 4,
    },
  });

  const dCode = sanitizeCode(departmentCode, 'DEPT');
  const department = await prisma.department.upsert({
    where: { code: dCode },
    update: {
      name: departmentName || dCode,
      facultyId: faculty.id,
    },
    create: {
      code: dCode,
      name: departmentName || dCode,
      facultyId: faculty.id,
    },
  });

  const progCode = `BSC-${dCode}`;
  const program = await prisma.program.upsert({
    where: { code: progCode },
    update: {
      name: programName || `BSc ${departmentName || dCode}`,
      departmentId: department.id,
    },
    create: {
      code: progCode,
      name: programName || `BSc ${departmentName || dCode}`,
      level: 'UNDERGRADUATE',
      departmentId: department.id,
      durationYears: 4,
    },
  });

  const academicYear =
    (await (async () => {
      const inferred = admissionYear ?? inferAdmissionYearFromBatchCode(batchCode);
      if (inferred) {
        const cohort = await computeCohortFieldsForAdmission(
          inferred,
          program.durationYears ?? 4
        );
        if (cohort?.academicYearId) {
          return prisma.academicYear.findUnique({ where: { id: cohort.academicYearId } });
        }
      }
      return (
        (await prisma.academicYear.findFirst({ orderBy: { start_date: 'desc' } })) ||
        (await prisma.academicYear.findFirst({ where: { name: '2024/2025' } }))
      );
    })()) ?? null;
  if (!academicYear) {
    throw new Error('No academic year in database — seed academic years first');
  }

  const inferredAdmission =
    admissionYear ??
    inferAdmissionYearFromBatchCode(batchCode) ??
    parseAcademicYearStartYear(academicYear.name) ??
    new Date().getFullYear();
  const cohortFields = await computeCohortFieldsForAdmission(
    inferredAdmission,
    program.durationYears ?? 4
  );

  const batchName = String(batchCode).trim();
  let batch = await prisma.batch.findFirst({
    where: { name: batchName, programId: program.id },
  });
  const batchData = {
    academic_year: cohortFields?.cohortStartYear ?? inferredAdmission,
    academicYearId: cohortFields?.academicYearId ?? academicYear.id,
    semester_number: cohortFields?.cohortSemester ?? 1,
  };

  if (!batch) {
    batch = await prisma.batch.create({
      data: {
        name: batchName,
        programId: program.id,
        ...batchData,
      },
    });
  } else {
    batch = await prisma.batch.update({
      where: { id: batch.id },
      data: batchData,
    });
  }

  // Sections are provisioned from university student roster (see ensureBatchSectionsFromStudentRoster).

  return {
    localFacultyId: faculty.id,
    localDepartmentId: department.id,
    localProgramId: program.id,
    localBatchId: batch.id,
  };
}

/** Match AIS department metadata to a local department row. */
export async function resolveLocalDepartmentByAisMeta({
  localFacultyId,
  deptName,
}) {
  const departments = await prisma.department.findMany({
    where: { facultyId: Number(localFacultyId) },
    select: { id: true, name: true, code: true },
  });
  if (!departments.length) return null;

  const nameKey = String(deptName ?? '').trim().toLowerCase();
  if (nameKey) {
    const exact = departments.find((d) => d.name.trim().toLowerCase() === nameKey);
    if (exact) return exact;
    const partial = departments.find(
      (d) =>
        d.name.toLowerCase().includes(nameKey) || nameKey.includes(d.name.toLowerCase())
    );
    if (partial) return partial;
  }

  return departments[0];
}

/** AIS labels use 2025-2026; Campus Connect seed uses 2025/2026. */
export async function resolveAcademicYearByLabel(label) {
  const raw = String(label ?? '').trim();
  if (!raw) {
    return prisma.academicYear.findFirst({ orderBy: { start_date: 'desc' } });
  }

  const candidates = [raw, raw.replace(/-/g, '/'), raw.replace(/\//g, '-')];
  for (const name of candidates) {
    const hit = await prisma.academicYear.findFirst({ where: { name } });
    if (hit) return hit;
  }

  return prisma.academicYear.findFirst({ orderBy: { start_date: 'desc' } });
}

export async function resolveSemesterForYear(academicYearId, sequence = 1) {
  const seq = Number(sequence) || 1;

  if (seq === 1 || seq === 2) {
    const nameCandidates =
      seq === 1
        ? ['First Semester', 'Semester 1', 'Semester I']
        : ['Second Semester', 'Semester 2', 'Semester II'];
    for (const name of nameCandidates) {
      const byName = await prisma.semester.findFirst({
        where: {
          academicYearId,
          name: { equals: name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (byName) return byName;
    }
  }

  return (
    (await prisma.semester.findFirst({
      where: { academicYearId, sequence: seq },
      select: { id: true },
    })) ||
    (await prisma.semester.findFirst({
      where: { academicYearId },
      orderBy: { sequence: 'asc' },
      select: { id: true },
    }))
  );
}

/** Current term from university course API (term=current) for one batch. */
export async function resolveUniversityAisActiveTerm(adapter, facultyId, batchCode) {
  if (!adapter?.fetchCourses || !facultyId || !batchCode) return null;
  try {
    const { meta } = await adapter.fetchCourses({
      facultyId: Number(facultyId),
      batch: String(batchCode),
      term: 'current',
    });
    if (!meta?.academicYear) return null;
    return {
      academicYearLabel: String(meta.academicYear).trim(),
      semesterNumber:
        meta.semester != null && Number.isFinite(Number(meta.semester))
          ? Number(meta.semester)
          : 1,
    };
  } catch {
    return null;
  }
}

/** Local batch + sections by AIS batch code (after student sync). */
export async function findLocalBatchByCode(batchCode) {
  const key = String(batchCode ?? '').trim();
  if (!key) return null;

  const batches = await prisma.batch.findMany({
    where: {
      OR: [
        { name: { equals: key, mode: 'insensitive' } },
        { name: { contains: key, mode: 'insensitive' } },
      ],
    },
    include: {
      program: { include: { department: { include: { faculty: true } } } },
      sections: { select: { id: true, name: true } },
    },
  });

  return (
    batches.find((b) => b.name.toLowerCase() === key.toLowerCase()) ||
    batches.find((b) => b.name.toLowerCase().includes(key.toLowerCase())) ||
    batches[0] ||
    null
  );
}

/** Create or load AcademicYear + two semesters from AIS label (2025-2026 or 2025/2026). */
export async function ensureAcademicYearFromUniversityLabel(label) {
  const raw = String(label ?? '').trim();
  if (!raw) throw new Error('Academic year label is required');

  let year = await resolveAcademicYearByLabel(raw);
  let created = false;

  if (!year) {
    const startYear = parseAcademicYearStartYear(raw.replace(/-/g, '/'));
    if (!startYear) throw new Error(`Cannot parse academic year label: ${raw}`);
    const bounds = buildAcademicYearBounds(startYear);
    year = await prisma.academicYear.create({
      data: {
        name: bounds.name,
        start_date: bounds.startDate,
        end_date: bounds.endDate,
      },
    });
    created = true;
  }

  const semCount = await prisma.semester.count({
    where: { academicYearId: year.id },
  });

  if (semCount < 2) {
    const startYear = parseAcademicYearStartYear(year.name);
    const bounds = buildAcademicYearBounds(
      startYear ?? year.start_date.getFullYear()
    );
    const [startSequence] = await getNextSemesterSequence(2);
    const rows = buildDefaultSemesterRows(bounds, startSequence).map((row) => ({
      ...row,
      academicYearId: year.id,
    }));
    await prisma.semester.createMany({ data: rows });
  }

  const withSemesters = await prisma.academicYear.findUnique({
    where: { id: year.id },
    include: { semesters: { orderBy: { sequence: 'asc' } } },
  });

  return { year: withSemesters ?? year, created };
}
