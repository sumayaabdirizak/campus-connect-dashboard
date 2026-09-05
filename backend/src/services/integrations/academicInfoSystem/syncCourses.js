import { prisma } from '../../../db/prisma.js';
import { getAcademicInfoSystemAdapter } from './index.js';
import {
  findLocalBatchByCode,
  resolveAcademicYearByLabel,
  resolveLocalDepartmentByAisMeta,
  resolveRegistrationTerms,
  resolveSemesterForYear,
} from './resolveAisSyncScope.js';

async function fetchCoursesForTerm(adapter, facultyId, batch, term) {
  try {
    const result = await adapter.fetchCourses({
      facultyId: Number(facultyId),
      batch: String(batch),
      term,
    });
    return { meta: result.meta ?? {}, courses: result.courses ?? [] };
  } catch {
    return { meta: {}, courses: [] };
  }
}

async function fetchOfferingCourses(adapter, facultyId, batch, termCandidates) {
  for (const term of termCandidates) {
    const { meta, courses } = await fetchCoursesForTerm(adapter, facultyId, batch, term);
    if (courses.length) {
      return { meta, courses, offeringTerm: term };
    }
  }
  return { meta: {}, courses: [], offeringTerm: null };
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

async function collectFacultyBatchCodes(adapter, externalFacultyId, localFacultyId) {
  const batchCodes = new Set();
  const departments = await adapter.listDepartments(Number(externalFacultyId));
  for (const dept of departments) {
    const externalDeptId = Number(dept.id ?? dept.departmentId ?? dept.DeptId);
    if (!externalDeptId) continue;
    try {
      const aisBatches = await adapter.listBatches(Number(externalFacultyId), externalDeptId);
      for (const batchRow of aisBatches) {
        const code = String(batchRow.BatchCode ?? batchRow.batch ?? '').trim();
        if (code) batchCodes.add(code);
      }
    } catch {
      // continue other departments
    }
  }

  if (localFacultyId) {
    const localBatches = await prisma.batch.findMany({
      where: { program: { department: { facultyId: localFacultyId } } },
      select: { name: true },
    });
    for (const row of localBatches) {
      const name = String(row.name ?? '').trim();
      if (name) batchCodes.add(name);
    }
  }

  return [...batchCodes].sort();
}

/**
 * Sync courses + offerings for one AIS batch into Campus Connect.
 *
 * @param {object} opts
 * @param {number} opts.facultyId — external AIS faculty id
 * @param {string} opts.batch — AIS batch code (e.g. BF03)
 * @param {string} [opts.catalogTerm] — university term for full catalog (default all)
 * @param {string} [opts.offeringTerm] — term for active offerings (default current, fallback year)
 * @param {string} [opts.term] — legacy alias for offeringTerm
 * @param {boolean} [opts.syncOfferings]
 * @param {boolean} [opts.dryRun]
 */
export async function syncCoursesFromAisForBatch(opts = {}) {
  const {
    facultyId,
    batch,
    catalogTerm = 'all',
    offeringTerm,
    term = 'current',
    dryRun = false,
    syncOfferings = true,
  } = opts;

  if (!facultyId || !batch) {
    throw new Error('facultyId and batch are required');
  }

  const adapter = getAcademicInfoSystemAdapter();
  const offeringTermCandidates = [offeringTerm, term, 'current', 'year'].filter(
    (value, index, arr) => value && arr.indexOf(value) === index
  );

  const { courses: catalogCourses } = await fetchCoursesForTerm(
    adapter,
    facultyId,
    batch,
    catalogTerm
  );

  const localBatch = await findLocalBatchByCode(batch);
  if (!localBatch) {
    throw new Error(
      `No local batch matches "${batch}". Run student sync first or create the batch in Campus Connect.`
    );
  }

  const localFacultyId = localBatch.program.department.facultyId;

  let offeringCourses = [];
  let offeringMeta = {};
  let activeOfferingTerm = null;
  if (syncOfferings) {
    const offeringResult = await fetchOfferingCourses(
      adapter,
      facultyId,
      batch,
      offeringTermCandidates
    );
    offeringCourses = offeringResult.courses;
    offeringMeta = offeringResult.meta;
    activeOfferingTerm = offeringResult.offeringTerm;
  }

  const offeringCodes = new Set(offeringCourses.map((row) => row.code).filter(Boolean));

  let academicYear = null;
  let semester = null;
  if (syncOfferings && offeringCodes.size > 0) {
    const academicYearLabel =
      offeringMeta.academicYear ??
      offeringCourses[0]?.academicYearLabel ??
      catalogCourses[0]?.academicYearLabel;

    if (academicYearLabel) {
      academicYear = await resolveAcademicYearByLabel(academicYearLabel);
    }
    if (!academicYear) {
      const terms = await resolveRegistrationTerms(null);
      academicYear = await prisma.academicYear.findUnique({
        where: { id: terms.currentAcademicYearId },
      });
      semester = await prisma.semester.findUnique({
        where: { id: terms.currentSemesterId },
      });
    } else {
      const semesterSequence =
        offeringMeta.semester ?? offeringCourses[0]?.semesterNumber ?? 1;
      semester = await resolveSemesterForYear(academicYear.id, semesterSequence);
    }

    if (!academicYear || !semester?.id) {
      throw new Error('No academic year in database — seed academic years first');
    }
  }

  const summary = {
    dryRun,
    facultyId: Number(facultyId),
    batch: String(batch),
    catalogTerm,
    offeringTerm: activeOfferingTerm,
    fetched: catalogCourses.length,
    offeringsEligible: offeringCodes.size,
    coursesCreated: 0,
    coursesUpdated: 0,
    offeringsCreated: 0,
    offeringsSkipped: 0,
    skipped: 0,
    errors: [],
    scope: {
      localBatchId: localBatch.id,
      localFacultyId,
      academicYearId: academicYear?.id ?? null,
      semesterId: semester?.id ?? null,
      sectionCount: localBatch.sections.length,
    },
  };

  for (const row of catalogCourses) {
    if (!row.code) {
      summary.skipped += 1;
      summary.errors.push({ code: null, message: 'Missing CourseCode' });
      continue;
    }

    const department =
      (await resolveLocalDepartmentByAisMeta({
        localFacultyId,
        deptName: row.deptName,
      })) || localBatch.program.department;

    const shouldCreateOfferings =
      syncOfferings && offeringCodes.has(row.code) && semester?.id && academicYear?.id;

    try {
      if (dryRun) {
        summary.coursesCreated += 1;
        if (shouldCreateOfferings) {
          summary.offeringsCreated += localBatch.sections.length;
        }
        continue;
      }

      const existing = await prisma.course.findUnique({ where: { code: row.code } });
      const courseData = {
        name: row.name || row.code,
        credits: row.credits,
        semesterNumber: row.semesterNumber,
        status: row.active ? 'ACTIVE' : 'INACTIVE',
        departmentId: department.id,
      };

      let courseId;
      if (existing) {
        await prisma.course.update({ where: { id: existing.id }, data: courseData });
        courseId = existing.id;
        summary.coursesUpdated += 1;
      } else {
        const created = await prisma.course.create({
          data: { code: row.code, ...courseData },
          select: { id: true },
        });
        courseId = created.id;
        summary.coursesCreated += 1;
      }

      if (!shouldCreateOfferings) continue;

      for (const section of localBatch.sections) {
        const offeringWhere = {
          courseId,
          sectionId: section.id,
          semesterId: semester.id,
          academicYearId: academicYear.id,
        };

        const existingOffering = await prisma.courseOffering.findFirst({
          where: offeringWhere,
          select: { id: true },
        });

        if (existingOffering) {
          summary.offeringsSkipped += 1;
          continue;
        }

        await prisma.courseOffering.create({ data: offeringWhere });
        summary.offeringsCreated += 1;
      }
    } catch (err) {
      summary.skipped += 1;
      summary.errors.push({ code: row.code, message: err?.message || 'Sync failed' });
    }
  }

  return summary;
}

function aggregateCourseSummary(totals, batchSummary) {
  totals.fetched += batchSummary.fetched;
  totals.coursesCreated += batchSummary.coursesCreated;
  totals.coursesUpdated += batchSummary.coursesUpdated;
  totals.offeringsCreated += batchSummary.offeringsCreated;
  totals.offeringsSkipped += batchSummary.offeringsSkipped;
  totals.skipped += batchSummary.skipped;
  totals.errors.push(...batchSummary.errors);
}

/**
 * Sync courses for every batch under an AIS faculty (AIS departments + local batches).
 */
export async function syncFacultyCoursesFromAis(opts = {}) {
  const {
    facultyId,
    catalogTerm = 'all',
    offeringTerm,
    term = 'current',
    dryRun = false,
    facultyCode,
    facultyName,
    syncOfferings = true,
  } = opts;

  if (!facultyId) {
    throw new Error('facultyId is required');
  }

  const adapter = getAcademicInfoSystemAdapter();
  const localFacultyId = await resolveLocalFacultyId(facultyCode, facultyName);
  const batchCodes = await collectFacultyBatchCodes(
    adapter,
    Number(facultyId),
    localFacultyId
  );

  const totals = {
    dryRun,
    facultyId: Number(facultyId),
    facultyCode: facultyCode ?? null,
    facultyName: facultyName ?? null,
    catalogTerm,
    batchesDiscovered: batchCodes.length,
    batchesProcessed: 0,
    fetched: 0,
    coursesCreated: 0,
    coursesUpdated: 0,
    offeringsCreated: 0,
    offeringsSkipped: 0,
    skipped: 0,
    errors: [],
    batches: [],
  };

  for (const batchCode of batchCodes) {
    try {
      const batchSummary = await syncCoursesFromAisForBatch({
        facultyId: Number(facultyId),
        batch: batchCode,
        catalogTerm,
        offeringTerm,
        term,
        dryRun,
        syncOfferings,
      });
      totals.batchesProcessed += 1;
      aggregateCourseSummary(totals, batchSummary);
      totals.batches.push({ batchCode, ...batchSummary });
    } catch (err) {
      totals.skipped += 1;
      totals.errors.push({ batch: batchCode, message: err?.message || 'Batch sync failed' });
      totals.batches.push({ batchCode, error: err?.message || 'Batch sync failed' });
    }
  }

  return totals;
}
