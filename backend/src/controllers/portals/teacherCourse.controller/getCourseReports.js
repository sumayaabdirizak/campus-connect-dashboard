import { prisma } from '../../../db/prisma.js';
import { respondInternalError } from '../../../utils/httpError.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import {
  findTeacherOfferings,
  findTeacherOfferingByPublicId,
  overallMarksByStudent,
  summarizeStudentOutcomes,
  totalActivityMarks,
  computeActivityFlagsByStudent,
  resolveStudentReportStatus,
} from './courseReportShared.js';

function quizWeight(q) {
  const planTotal = q.marksPlan?.totalMarks;
  if (q.maxMarks > 0) return q.maxMarks;
  if (Number.isInteger(planTotal) && planTotal > 0) return planTotal;
  return 0;
}

/** Lightweight list scan — no student rows (grades loaded only for the page). */
const META_INCLUDE = {
  course: {
    select: {
      code: true,
      name: true,
      maxMarks: true,
      department: { select: { name: true } },
    },
  },
  section: {
    select: {
      name: true,
      batch: { select: { name: true } },
      _count: { select: { studentRegistrations: true } },
    },
  },
  assignments: {
    where: { lifecycle: { publishStatus: 'PUBLISHED' } },
    select: { id: true, maxMarks: true, due_date: true },
  },
  quizzes: {
    where: { is_draft: false },
    select: { id: true, maxMarks: true, marksPlan: true, close_at: true },
  },
  resources: {
    where: { is_draft: false, status: 'APPROVED' },
    select: { id: true },
  },
};

const PAGE_INCLUDE = {
  ...META_INCLUDE,
  section: {
    select: {
      name: true,
      batch: { select: { name: true } },
      _count: { select: { studentRegistrations: true } },
      studentRegistrations: {
        select: { student: { select: { id: true, full_name: true, number: true } } },
      },
    },
  },
};

const DETAIL_INCLUDE = {
  course: {
    select: {
      code: true,
      name: true,
      maxMarks: true,
      department: { select: { name: true } },
    },
  },
  section: {
    select: {
      name: true,
      batch: { select: { name: true } },
      studentRegistrations: {
        select: { student: { select: { id: true, full_name: true, number: true } } },
      },
    },
  },
  assignments: {
    where: { lifecycle: { publishStatus: 'PUBLISHED' } },
    orderBy: { due_date: 'asc' },
    select: {
      id: true,
      title: true,
      due_date: true,
      maxMarks: true,
    },
  },
  quizzes: {
    where: { is_draft: false },
    orderBy: [{ close_at: 'asc' }, { created_at: 'desc' }],
    select: {
      id: true,
      title: true,
      close_at: true,
      maxMarks: true,
      marksPlan: true,
    },
  },
  resources: {
    where: { is_draft: false, status: 'APPROVED' },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
    },
  },
};

const GRADE_SORT_KEYS = new Set(['failed', 'avgOverallPct', 'avgOverallMarks']);

function parseSort(raw) {
  const s = typeof raw === 'string' && raw ? raw : 'courseCode-asc';
  const [key, dir] = s.split('-');
  return { key: key || 'courseCode', dir: dir === 'desc' ? 'desc' : 'asc' };
}

function sortRows(rows, { key, dir }) {
  const mult = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    return String(av ?? '').localeCompare(String(bv ?? '')) * mult;
  });
}

function matchesCourseSearch(row, q) {
  if (!q) return true;
  const hay = [row.courseCode, row.courseName, row.section, row.batch, row.department]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function metaRow(o) {
  return {
    _dbId: o.id,
    id: o.publicId,
    courseCode: o.course.code,
    courseName: o.course.name,
    department: o.course.department?.name ?? null,
    section: o.section.name,
    batch: o.section.batch?.name ?? null,
    students: o.section._count?.studentRegistrations ?? 0,
    quizzes: o.quizzes.length,
    assignments: o.assignments.length,
    resources: o.resources.length,
    failed: 0,
    avgOverallPct: null,
    avgOverallMarks: null,
    courseMaxMarks: o.course?.maxMarks ?? 100,
  };
}

async function loadGradesForOfferings(offerings, { from = null, to = null } = {}) {
  const assignmentIds = offerings.flatMap((o) => o.assignments.map((a) => a.id));
  const quizIds = offerings.flatMap((o) => o.quizzes.map((q) => q.id));

  const submittedAt = {};
  if (from) submittedAt.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) submittedAt.lte = new Date(`${to}T23:59:59.999Z`);
  const hasDate = Object.keys(submittedAt).length > 0;

  const [submissions, attempts] = await Promise.all([
    assignmentIds.length
      ? prisma.submission.findMany({
          where: {
            assignmentId: { in: assignmentIds },
            ...(hasDate ? { submitted_at: submittedAt } : {}),
          },
          select: {
            assignmentId: true,
            studentId: true,
            gradeRow: { select: { score: true } },
          },
        })
      : Promise.resolve([]),
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: {
            quizId: { in: quizIds },
            submitted_at: { not: null, ...(hasDate ? submittedAt : {}) },
          },
          select: {
            quizId: true,
            studentId: true,
            grade: true,
            score: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const assignmentOffering = new Map();
  const quizOffering = new Map();
  for (const o of offerings) {
    for (const a of o.assignments) assignmentOffering.set(a.id, o.id);
    for (const q of o.quizzes) quizOffering.set(q.id, o.id);
  }

  const byOffering = new Map();
  for (const o of offerings) {
    const quizWeightById = new Map(o.quizzes.map((q) => [q.id, quizWeight(q)]));
    const maxMarksByAssignmentId = new Map();
    for (const a of o.assignments) {
      maxMarksByAssignmentId.set(a.id, a.maxMarks || 10);
    }
    const activityTotal = totalActivityMarks({
      maxMarksByAssignmentId,
      quizWeightById,
    });
    byOffering.set(o.id, {
      submissions: [],
      attempts: [],
      maxMarksByAssignmentId,
      quizWeightById,
      courseMaxMarks:
        activityTotal > 0 ? activityTotal : o.course?.maxMarks ?? 100,
    });
  }

  for (const s of submissions) {
    const oid = assignmentOffering.get(s.assignmentId);
    if (oid == null) continue;
    byOffering.get(oid).submissions.push(s);
  }
  for (const a of attempts) {
    const oid = quizOffering.get(a.quizId);
    if (oid == null) continue;
    byOffering.get(oid).attempts.push(a);
  }

  return byOffering;
}

function enrichWithOutcomes(offering, gradeBundle) {
  const students = offering.section.studentRegistrations.map((r) => r.student);
  const marksByStudent = overallMarksByStudent(gradeBundle);
  const flagsLookup = computeActivityFlagsByStudent({
    assignments: offering.assignments,
    quizzes: offering.quizzes,
    submissions: gradeBundle.submissions,
    attempts: gradeBundle.attempts,
  });
  const outcomes = summarizeStudentOutcomes(
    students,
    marksByStudent,
    gradeBundle.courseMaxMarks,
    flagsLookup
  );
  return {
    students: students.length,
    failed: outcomes.failedCount,
    avgOverallPct: outcomes.avgOverallPct,
    avgOverallMarks: outcomes.avgOverallMarks,
    courseMaxMarks: outcomes.courseMaxMarks,
  };
}

/**
 * GET /api/lecturer-portal/course-reports
 * Paginated table rows: content posted + failed student counts per course.
 * Query: page, pageSize|limit, q, department, courseId, sort, from, to
 */
export async function listCourseReports(req, res) {
  try {
    const userId = Number(req.user.sub);
    if (!userId) return res.status(401).json({ message: 'Invalid user context' });

    const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
    const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const department =
      typeof req.query.department === 'string' && req.query.department !== 'all'
        ? req.query.department.trim()
        : '';
    const courseId =
      typeof req.query.courseId === 'string' && req.query.courseId !== 'all'
        ? req.query.courseId.trim()
        : '';
    const sort = parseSort(req.query.sort);
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 25,
      maxPageSize: 1000,
    });

    const metaOfferings = await findTeacherOfferings(req.user, META_INCLUDE);
    let rows = metaOfferings.map(metaRow);

    const filterOptions = {
      departments: [
        ...new Set(rows.map((r) => r.department).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b)),
      courses: rows
        .map((r) => ({
          id: r.id,
          label: `${r.courseCode} — ${r.courseName}`,
          department: r.department,
          section: r.section,
          batch: r.batch,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };

    rows = rows.filter((r) => {
      if (department && (r.department ?? '').trim() !== department) return false;
      if (courseId && r.id !== courseId) return false;
      if (!matchesCourseSearch(r, q)) return false;
      return true;
    });

    const needsGradeSort = GRADE_SORT_KEYS.has(sort.key);

    if (needsGradeSort) {
      const full = await findTeacherOfferings(req.user, PAGE_INCLUDE);
      const byPublic = new Map(full.map((o) => [o.publicId, o]));
      const filteredOfferings = rows
        .map((r) => byPublic.get(r.id))
        .filter(Boolean);
      const gradesByOffering = await loadGradesForOfferings(filteredOfferings, { from, to });
      rows = filteredOfferings.map((o) => {
        const base = metaRow(o);
        const gradeBundle = gradesByOffering.get(o.id) ?? {
          submissions: [],
          attempts: [],
          maxMarksByAssignmentId: new Map(),
          quizWeightById: new Map(),
          courseMaxMarks: base.courseMaxMarks,
        };
        const outcomes = enrichWithOutcomes(o, gradeBundle);
        const { _dbId: _omit, ...rest } = { ...base, ...outcomes };
        return rest;
      });
      rows = sortRows(rows, sort);
      const total = rows.length;
      const pageRows = rows.slice(skip, skip + pageSize);
      return res.json({
        generatedAt: new Date().toISOString(),
        rows: pageRows,
        page,
        pageSize,
        total,
        totalCount: total,
        filterOptions,
      });
    }

    rows = sortRows(rows, sort);
    const total = rows.length;
    const pageMeta = rows.slice(skip, skip + pageSize);
    const pageDbIds = pageMeta.map((r) => r._dbId);

    const pageOfferings =
      pageDbIds.length > 0
        ? await prisma.courseOffering.findMany({
            where: { id: { in: pageDbIds } },
            include: PAGE_INCLUDE,
          })
        : [];
    const gradesByOffering = await loadGradesForOfferings(pageOfferings, { from, to });
    const byId = new Map(pageOfferings.map((o) => [o.id, o]));

    const pageRows = pageMeta.map((r) => {
      const o = byId.get(r._dbId);
      if (!o) {
        const { _dbId, ...rest } = r;
        return rest;
      }
      const gradeBundle = gradesByOffering.get(o.id) ?? {
        submissions: [],
        attempts: [],
        maxMarksByAssignmentId: new Map(),
        quizWeightById: new Map(),
        courseMaxMarks: r.courseMaxMarks,
      };
      const outcomes = enrichWithOutcomes(o, gradeBundle);
      return {
        id: r.id,
        courseCode: r.courseCode,
        courseName: r.courseName,
        department: r.department,
        section: r.section,
        batch: r.batch,
        quizzes: r.quizzes,
        assignments: r.assignments,
        resources: r.resources,
        ...outcomes,
      };
    });

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
    respondInternalError(res, 'Failed to list course reports', e);
  }
}

/**
 * GET /api/lecturer-portal/course-reports/:offeringId
 * One course: content posted + class outcomes + failed students.
 */
export async function getCourseReport(req, res) {
  try {
    const userId = Number(req.user.sub);
    if (!userId) return res.status(401).json({ message: 'Invalid user context' });

    const { offeringId } = req.params;
    const offering = await findTeacherOfferingByPublicId(req.user, offeringId, DETAIL_INCLUDE);
    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    const gradesByOffering = await loadGradesForOfferings([offering]);
    const gradeBundle = gradesByOffering.get(offering.id) ?? {
      submissions: [],
      attempts: [],
      maxMarksByAssignmentId: new Map(),
      quizWeightById: new Map(),
      courseMaxMarks: 0,
    };
    const students = offering.section.studentRegistrations.map((r) => r.student);
    const marksByStudent = overallMarksByStudent(gradeBundle);
    const flagsLookup = computeActivityFlagsByStudent({
      assignments: offering.assignments,
      quizzes: offering.quizzes,
      submissions: gradeBundle.submissions,
      attempts: gradeBundle.attempts,
    });
    const outcomes = summarizeStudentOutcomes(
      students,
      marksByStudent,
      gradeBundle.courseMaxMarks,
      flagsLookup
    );

    const studentRows = students
      .map((student) => {
        const row = marksByStudent.get(student.id);
        const overallPct = row?.pct ?? null;
        const overallMarks = row?.earned ?? null;
        return {
          studentId: student.id,
          name: student.full_name,
          number: student.number ?? null,
          overallPct: overallPct == null ? null : Math.round(overallPct * 10) / 10,
          overallMarks,
          status: resolveStudentReportStatus(row, flagsLookup.forStudent(student.id)),
        };
      })
      .sort((a, b) => {
        if (a.overallMarks == null && b.overallMarks == null) {
          return a.name.localeCompare(b.name);
        }
        if (a.overallMarks == null) return 1;
        if (b.overallMarks == null) return -1;
        return a.overallMarks - b.overallMarks;
      });

    res.json({
      generatedAt: new Date().toISOString(),
      course: {
        id: offering.publicId,
        courseCode: offering.course.code,
        courseName: offering.course.name,
        department: offering.course.department?.name ?? null,
        section: offering.section.name,
        batch: offering.section.batch?.name ?? null,
      },
      content: {
        quizzes: offering.quizzes.length,
        assignments: offering.assignments.length,
        resources: offering.resources.length,
        quizItems: offering.quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          dueAt: q.close_at?.toISOString?.() ?? q.close_at ?? null,
        })),
        assignmentItems: offering.assignments.map((a) => ({
          id: a.id,
          title: a.title,
          dueAt: a.due_date?.toISOString?.() ?? a.due_date ?? null,
        })),
        resourceItems: offering.resources.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
        })),
      },
      classSummary: {
        studentCount: students.length,
        avgOverallPct: outcomes.avgOverallPct,
        avgOverallMarks: outcomes.avgOverallMarks,
        courseMaxMarks: outcomes.courseMaxMarks,
        passedCount: outcomes.passedCount,
        failedCount: outcomes.failedCount,
        ungradedCount: outcomes.ungradedCount,
        noGradeCount: outcomes.noGradeCount,
        missingCount: outcomes.missingCount,
        notSubmittedCount: outcomes.notSubmittedCount,
      },
      failedStudents: outcomes.failedStudents,
      students: studentRows,
    });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to build course report', e);
  }
}
