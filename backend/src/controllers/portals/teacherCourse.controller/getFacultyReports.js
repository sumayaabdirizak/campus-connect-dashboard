import { prisma } from '../../../db/prisma.js';
import { respondInternalError } from '../../../utils/httpError.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { findTeacherOfferings } from './courseReportShared.js';
import {
  OFFERING_REPORT_INCLUDE,
  averageNullable,
  enrichWithOutcomes,
  loadGradesForOfferings,
  parseSort,
  roleName,
  sortRows,
} from './reportOfferingGrades.js';

/** Faculty-wide rollups only make sense for Super Admin — a Dean's own
 *  faculty is a single row, not a list to compare against others. */
function assertSuperAdminAccess(req, res) {
  if (roleName(req.user) !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Forbidden' });
    return false;
  }
  return true;
}

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

async function allFaculties() {
  const [faculties, deptCounts] = await Promise.all([
    prisma.faculty.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
    prisma.department.groupBy({ by: ['facultyId'], _count: { _all: true } }),
  ]);
  const deptCountByFaculty = new Map(deptCounts.map((d) => [d.facultyId, d._count._all]));
  return faculties.map((f) => ({ ...f, departments: deptCountByFaculty.get(f.id) ?? 0 }));
}

/**
 * GET /api/lecturer-portal/faculty-reports
 */
export async function listFacultyReports(req, res) {
  try {
    if (!assertSuperAdminAccess(req, res)) return;

    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const facultyIdRaw =
      typeof req.query.facultyId === 'string' && req.query.facultyId !== 'all'
        ? req.query.facultyId.trim()
        : '';
    const facultyIdFilter = facultyIdRaw ? Number(facultyIdRaw) : null;
    const sort = parseSort(req.query.sort, 'name-asc');
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 25,
      maxPageSize: 1000,
    });

    const [offerings, faculties] = await Promise.all([
      findTeacherOfferings(req.user, OFFERING_REPORT_INCLUDE),
      allFaculties(),
    ]);

    const gradesByOffering = await loadGradesForOfferings(offerings, { from, to });

    const byFaculty = new Map();
    for (const f of faculties) {
      byFaculty.set(f.id, {
        id: f.id,
        name: f.name,
        code: f.code,
        departments: f.departments,
        offerings: [],
      });
    }

    for (const o of offerings) {
      const fid = o.section?.batch?.program?.department?.facultyId;
      if (fid == null) continue;
      if (!byFaculty.has(fid)) {
        byFaculty.set(fid, {
          id: fid,
          name: `Faculty #${fid}`,
          code: null,
          departments: 0,
          offerings: [],
        });
      }
      byFaculty.get(fid).offerings.push(o);
    }

    let rows = [...byFaculty.values()].map((f) => {
      const rollup = rollupOfferings(f.offerings, gradesByOffering);
      return {
        id: f.id,
        name: f.name,
        code: f.code,
        departments: f.departments,
        courses: rollup.courses,
        students: rollup.students,
        quizzes: rollup.quizzes,
        assignments: rollup.assignments,
        resources: rollup.resources,
        failed: rollup.failed,
        avgOverallPct: rollup.avgOverallPct,
        avgOverallMarks: rollup.avgOverallMarks,
      };
    });

    const filterOptions = {
      faculties: rows
        .map((r) => ({ id: String(r.id), name: r.name, code: r.code }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };

    rows = rows.filter((r) => {
      if (facultyIdFilter && r.id !== facultyIdFilter) return false;
      if (q) {
        const hay = [r.name, r.code].filter(Boolean).join(' ').toLowerCase();
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
    respondInternalError(res, 'Failed to list faculty reports', e);
  }
}

/**
 * GET /api/lecturer-portal/faculty-reports/:facultyId
 */
export async function getFacultyReport(req, res) {
  try {
    if (!assertSuperAdminAccess(req, res)) return;

    const facultyId = Number(req.params.facultyId);
    if (!facultyId) return res.status(400).json({ message: 'facultyId is required' });

    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;

    const [offerings, faculty, departments] = await Promise.all([
      findTeacherOfferings(req.user, OFFERING_REPORT_INCLUDE),
      prisma.faculty.findFirst({ where: { id: facultyId }, select: { id: true, name: true, code: true } }),
      prisma.department.findMany({
        where: { facultyId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const facultyOfferings = offerings.filter(
      (o) => o.section?.batch?.program?.department?.facultyId === facultyId
    );

    if (!faculty && facultyOfferings.length === 0) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    const gradesByOffering = await loadGradesForOfferings(facultyOfferings, { from, to });
    const rollup = rollupOfferings(facultyOfferings, gradesByOffering);

    const departmentStats = departments.map((d) => {
      const deptOfferings = facultyOfferings.filter(
        (o) => o.course.department?.name === d.name
      );
      const students = new Set(
        deptOfferings.flatMap((o) =>
          (o.section?.studentRegistrations ?? []).map((r) => r.student?.id).filter(Boolean)
        )
      ).size;
      return { id: d.id, name: d.name, courses: deptOfferings.length, students };
    });

    res.json({
      generatedAt: new Date().toISOString(),
      faculty: {
        id: facultyId,
        name: faculty?.name ?? `Faculty #${facultyId}`,
        code: faculty?.code ?? null,
      },
      summary: {
        departments: departments.length,
        courses: rollup.courses,
        students: rollup.students,
        quizzes: rollup.quizzes,
        assignments: rollup.assignments,
        resources: rollup.resources,
        failed: rollup.failed,
        avgOverallPct: rollup.avgOverallPct,
        avgOverallMarks: rollup.avgOverallMarks,
      },
      departments: departmentStats,
      courses: rollup.courseRows,
    });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to load faculty report', e);
  }
}
