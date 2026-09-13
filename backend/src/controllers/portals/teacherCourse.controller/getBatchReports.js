import { prisma } from '../../../db/prisma.js';
import { respondInternalError } from '../../../utils/httpError.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { findTeacherOfferings } from './courseReportShared.js';
import {
  OFFERING_REPORT_INCLUDE,
  assertFacultyAggregateAccess,
  averageNullable,
  enrichWithOutcomes,
  loadGradesForOfferings,
  parseSort,
  roleName,
  sortRows,
} from './reportOfferingGrades.js';

function offeringCourseRow(o, outcomes) {
  return {
    id: o.publicId,
    courseCode: o.course.code,
    courseName: o.course.name,
    department: o.course.department?.name ?? null,
    section: o.section.name,
    batch: o.section.batch?.name ?? null,
    students: outcomes.students,
    quizzes: o.quizzes.length,
    assignments: o.assignments.length,
    resources: o.resources.length,
    failed: outcomes.failed,
    avgOverallPct: outcomes.avgOverallPct,
    avgOverallMarks: outcomes.avgOverallMarks,
    courseMaxMarks: outcomes.courseMaxMarks,
  };
}

function rollupOfferings(offerings, gradesByOffering) {
  const studentIds = new Set();
  let quizzes = 0;
  let assignments = 0;
  let resources = 0;
  let failed = 0;
  const pcts = [];
  const marks = [];
  const courseRows = [];

  for (const o of offerings) {
    const gradeBundle = gradesByOffering.get(o.id) ?? {
      submissions: [],
      attempts: [],
      maxMarksByAssignmentId: new Map(),
      quizWeightById: new Map(),
      courseMaxMarks: o.course?.maxMarks ?? 100,
    };
    const outcomes = enrichWithOutcomes(o, gradeBundle);
    for (const r of o.section?.studentRegistrations ?? []) {
      if (r.student?.id != null) studentIds.add(r.student.id);
    }
    quizzes += o.quizzes.length;
    assignments += o.assignments.length;
    resources += o.resources.length;
    failed += outcomes.failed;
    if (outcomes.avgOverallPct != null) pcts.push(outcomes.avgOverallPct);
    if (outcomes.avgOverallMarks != null) marks.push(outcomes.avgOverallMarks);
    courseRows.push(offeringCourseRow(o, outcomes));
  }

  return {
    courses: offerings.length,
    students: studentIds.size,
    quizzes,
    assignments,
    resources,
    failed,
    avgOverallPct: averageNullable(pcts),
    avgOverallMarks: averageNullable(marks),
    courseRows,
  };
}

async function facultyBatches(user) {
  const role = roleName(user);
  const facultyId = Number(user.facultyId) || null;

  const where =
    role === 'DEAN' && facultyId
      ? { program: { department: { facultyId } } }
      : role === 'SUPER_ADMIN'
        ? {}
        : { id: -1 };

  return prisma.batch.findMany({
    where,
    select: {
      id: true,
      name: true,
      status: true,
      program: {
        select: {
          name: true,
          department: { select: { name: true } },
        },
      },
      sections: {
        select: {
          id: true,
          name: true,
          _count: { select: { studentRegistrations: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * GET /api/lecturer-portal/batch-reports
 */
export async function listBatchReports(req, res) {
  try {
    if (!assertFacultyAggregateAccess(req, res)) return;

    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const department =
      typeof req.query.department === 'string' && req.query.department !== 'all'
        ? req.query.department.trim()
        : '';
    const batchIdRaw =
      typeof req.query.batchId === 'string' && req.query.batchId !== 'all'
        ? req.query.batchId.trim()
        : '';
    const batchIdFilter = batchIdRaw ? Number(batchIdRaw) : null;
    const statusRaw =
      typeof req.query.status === 'string' ? req.query.status.trim() : '';
    // Default to ACTIVE (same idea as university /dean/batches). Pass status=all for every batch.
    const status =
      !statusRaw || statusRaw === 'ACTIVE'
        ? 'ACTIVE'
        : statusRaw === 'all'
          ? ''
          : statusRaw;
    const sort = parseSort(req.query.sort, 'name-asc');
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 25,
      maxPageSize: 1000,
    });

    const [offerings, batches] = await Promise.all([
      findTeacherOfferings(req.user, OFFERING_REPORT_INCLUDE),
      facultyBatches(req.user),
    ]);

    const gradesByOffering = await loadGradesForOfferings(offerings, { from, to });

    const byBatch = new Map();
    for (const b of batches) {
      const rosterStudents = b.sections.reduce(
        (n, s) => n + (s._count?.studentRegistrations ?? 0),
        0
      );
      byBatch.set(b.id, {
        id: b.id,
        name: b.name,
        status: b.status ?? null,
        programme: b.program?.name ?? null,
        department: b.program?.department?.name ?? null,
        sectionCount: b.sections.length,
        rosterStudents,
        offerings: [],
      });
    }

    for (const o of offerings) {
      const bid = o.section?.batchId ?? o.section?.batch?.id;
      if (bid == null) continue;
      if (!byBatch.has(bid)) {
        byBatch.set(bid, {
          id: bid,
          name: o.section.batch?.name ?? `Batch #${bid}`,
          status: o.section.batch?.status ?? null,
          programme: o.section.batch?.program?.name ?? null,
          department:
            o.section.batch?.program?.department?.name ?? o.course.department?.name ?? null,
          sectionCount: 0,
          rosterStudents: 0,
          offerings: [],
        });
      }
      byBatch.get(bid).offerings.push(o);
    }

    let rows = [...byBatch.values()].map((b) => {
      const rollup = rollupOfferings(b.offerings, gradesByOffering);
      const offeringSectionCount = new Set(
        b.offerings.map((o) => o.section?.id).filter(Boolean)
      ).size;
      return {
        id: b.id,
        name: b.name,
        status: b.status,
        programme: b.programme,
        department: b.department,
        sections: b.sectionCount > 0 ? b.sectionCount : offeringSectionCount,
        students: Math.max(b.rosterStudents, rollup.students),
        courses: rollup.courses,
        quizzes: rollup.quizzes,
        assignments: rollup.assignments,
        resources: rollup.resources,
        failed: rollup.failed,
        avgOverallPct: rollup.avgOverallPct,
        avgOverallMarks: rollup.avgOverallMarks,
      };
    });

    const filterOptions = {
      departments: [...new Set(rows.map((r) => r.department).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
      statuses: [...new Set(rows.map((r) => r.status).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
      batches: rows
        .map((r) => ({
          id: String(r.id),
          name: r.name,
          programme: r.programme,
          department: r.department,
          status: r.status,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };

    rows = rows.filter((r) => {
      if (department && (r.department ?? '').trim() !== department) return false;
      if (batchIdFilter && r.id !== batchIdFilter) return false;
      if (status && String(r.status ?? '') !== status) return false;
      if (q) {
        const hay = [r.name, r.programme, r.department, r.status]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });

    rows = sortRows(rows, sort);
    const total = rows.length;
    const pageRows = rows.slice(skip, skip + pageSize);

    res.json({
      generatedAt: new Date().toISOString(),
      rows: pageRows,
      page,
      pageSize,
      total,
      totalCount: total,
      filterOptions,
    });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to list batch reports', e);
  }
}

/**
 * GET /api/lecturer-portal/batch-reports/:batchId
 */
export async function getBatchReport(req, res) {
  try {
    if (!assertFacultyAggregateAccess(req, res)) return;

    const batchId = Number(req.params.batchId);
    if (!batchId) return res.status(400).json({ message: 'batchId is required' });

    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;

    const [offerings, batch] = await Promise.all([
      findTeacherOfferings(req.user, OFFERING_REPORT_INCLUDE),
      prisma.batch.findFirst({
        where: { id: batchId },
        select: {
          id: true,
          name: true,
          status: true,
          program: {
            select: {
              name: true,
              department: { select: { name: true, facultyId: true } },
            },
          },
          sections: {
            select: {
              id: true,
              name: true,
              _count: { select: { studentRegistrations: true } },
            },
          },
        },
      }),
    ]);

    const role = roleName(req.user);
    const facultyId = Number(req.user.facultyId) || null;
    if (
      role === 'DEAN' &&
      facultyId &&
      batch &&
      batch.program?.department?.facultyId !== facultyId
    ) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const batchOfferings = offerings.filter(
      (o) => (o.section?.batchId ?? o.section?.batch?.id) === batchId
    );

    if (!batch && batchOfferings.length === 0) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const gradesByOffering = await loadGradesForOfferings(batchOfferings, { from, to });
    const rollup = rollupOfferings(batchOfferings, gradesByOffering);

    const sections =
      batch?.sections?.map((s) => ({
        id: s.id,
        name: s.name,
        students: s._count?.studentRegistrations ?? 0,
      })) ??
      [
        ...new Map(
          batchOfferings.map((o) => [
            o.section.id,
            {
              id: o.section.id,
              name: o.section.name,
              students: o.section._count?.studentRegistrations ?? o.section.studentRegistrations?.length ?? 0,
            },
          ])
        ).values(),
      ];

    res.json({
      generatedAt: new Date().toISOString(),
      batch: {
        id: batchId,
        name: batch?.name ?? batchOfferings[0]?.section?.batch?.name ?? `Batch #${batchId}`,
        status: batch?.status ?? batchOfferings[0]?.section?.batch?.status ?? null,
        programme: batch?.program?.name ?? batchOfferings[0]?.section?.batch?.program?.name ?? null,
        department:
          batch?.program?.department?.name ??
          batchOfferings[0]?.section?.batch?.program?.department?.name ??
          null,
      },
      summary: {
        sections: sections.length,
        students: Math.max(
          sections.reduce((n, s) => n + s.students, 0),
          rollup.students
        ),
        courses: rollup.courses,
        quizzes: rollup.quizzes,
        assignments: rollup.assignments,
        resources: rollup.resources,
        failed: rollup.failed,
        avgOverallPct: rollup.avgOverallPct,
        avgOverallMarks: rollup.avgOverallMarks,
      },
      sections,
      courses: rollup.courseRows,
    });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to load batch report', e);
  }
}
