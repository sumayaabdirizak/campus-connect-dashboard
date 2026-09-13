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

async function facultyLecturers(user) {
  const role = roleName(user);
  const facultyId = Number(user.facultyId) || null;

  if (role === 'DEAN' && facultyId) {
    return prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { name: 'TEACHER' },
        OR: [
          { lecturerProfile: { faculties: { some: { facultyId } } } },
          { lecturerProfile: { department: { facultyId } } },
        ],
      },
      select: {
        id: true,
        full_name: true,
        number: true,
        lecturerProfile: { select: { department: { select: { name: true } } } },
      },
      orderBy: { full_name: 'asc' },
    });
  }

  if (role === 'SUPER_ADMIN') {
    return prisma.user.findMany({
      where: { status: 'ACTIVE', role: { name: 'TEACHER' } },
      select: {
        id: true,
        full_name: true,
        number: true,
        lecturerProfile: { select: { department: { select: { name: true } } } },
      },
      orderBy: { full_name: 'asc' },
    });
  }

  return [];
}

/**
 * GET /api/lecturer-portal/lecturer-reports
 */
export async function listLecturerReports(req, res) {
  try {
    if (!assertFacultyAggregateAccess(req, res)) return;

    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const department =
      typeof req.query.department === 'string' && req.query.department !== 'all'
        ? req.query.department.trim()
        : '';
    const lecturerIdRaw =
      typeof req.query.lecturerId === 'string' && req.query.lecturerId !== 'all'
        ? req.query.lecturerId.trim()
        : '';
    const lecturerIdFilter = lecturerIdRaw ? Number(lecturerIdRaw) : null;
    const sort = parseSort(req.query.sort, 'name-asc');
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 25,
      maxPageSize: 1000,
    });

    const [offerings, lecturers] = await Promise.all([
      findTeacherOfferings(req.user, OFFERING_REPORT_INCLUDE),
      facultyLecturers(req.user),
    ]);

    const gradesByOffering = await loadGradesForOfferings(offerings, { from, to });

    const byTeacher = new Map();
    for (const t of lecturers) {
      byTeacher.set(t.id, {
        id: t.id,
        name: t.full_name,
        number: t.number ?? null,
        department: t.lecturerProfile?.department?.name ?? null,
        offerings: [],
      });
    }
    for (const o of offerings) {
      const tid = o.teacherId ?? o.teacher?.id;
      if (tid == null) continue;
      if (!byTeacher.has(tid)) {
        byTeacher.set(tid, {
          id: tid,
          name: o.teacher?.full_name ?? `Lecturer #${tid}`,
          number: o.teacher?.number ?? null,
          department: o.teacher?.lecturerProfile?.department?.name ?? o.course.department?.name ?? null,
          offerings: [],
        });
      }
      byTeacher.get(tid).offerings.push(o);
    }

    let rows = [...byTeacher.values()].map((t) => {
      const rollup = rollupOfferings(t.offerings, gradesByOffering);
      return {
        id: t.id,
        name: t.name,
        number: t.number,
        department: t.department,
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
      departments: [...new Set(rows.map((r) => r.department).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
      lecturers: rows
        .map((r) => ({
          id: String(r.id),
          name: r.name,
          number: r.number,
          department: r.department,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };

    rows = rows.filter((r) => {
      if (department && (r.department ?? '').trim() !== department) return false;
      if (lecturerIdFilter && r.id !== lecturerIdFilter) return false;
      if (q) {
        const hay = [r.name, r.number, r.department].filter(Boolean).join(' ').toLowerCase();
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
    respondInternalError(res, 'Failed to list lecturer reports', e);
  }
}

/**
 * GET /api/lecturer-portal/lecturer-reports/:teacherId
 */
export async function getLecturerReport(req, res) {
  try {
    if (!assertFacultyAggregateAccess(req, res)) return;

    const teacherId = Number(req.params.teacherId);
    if (!teacherId) return res.status(400).json({ message: 'teacherId is required' });

    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;

    const [offerings, lecturer] = await Promise.all([
      findTeacherOfferings(req.user, OFFERING_REPORT_INCLUDE),
      prisma.user.findFirst({
        where: { id: teacherId, role: { name: 'TEACHER' } },
        select: {
          id: true,
          full_name: true,
          number: true,
          lecturerProfile: { select: { department: { select: { name: true } } } },
        },
      }),
    ]);

    const teacherOfferings = offerings.filter(
      (o) => (o.teacherId ?? o.teacher?.id) === teacherId
    );

    if (!lecturer && teacherOfferings.length === 0) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }

    const gradesByOffering = await loadGradesForOfferings(teacherOfferings, { from, to });
    const rollup = rollupOfferings(teacherOfferings, gradesByOffering);
    const name =
      lecturer?.full_name ??
      teacherOfferings[0]?.teacher?.full_name ??
      `Lecturer #${teacherId}`;

    res.json({
      generatedAt: new Date().toISOString(),
      lecturer: {
        id: teacherId,
        name,
        number: lecturer?.number ?? teacherOfferings[0]?.teacher?.number ?? null,
        department:
          lecturer?.lecturerProfile?.department?.name ??
          teacherOfferings[0]?.teacher?.lecturerProfile?.department?.name ??
          null,
      },
      summary: {
        courses: rollup.courses,
        students: rollup.students,
        quizzes: rollup.quizzes,
        assignments: rollup.assignments,
        resources: rollup.resources,
        failed: rollup.failed,
        avgOverallPct: rollup.avgOverallPct,
        avgOverallMarks: rollup.avgOverallMarks,
      },
      courses: rollup.courseRows,
    });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to load lecturer report', e);
  }
}
