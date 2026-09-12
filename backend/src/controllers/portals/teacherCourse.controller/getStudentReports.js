import { prisma } from '../../../db/prisma.js';
import { respondInternalError } from '../../../utils/httpError.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import {
  findTeacherOfferings,
  findTeacherOfferingByPublicId,
  overallMarksByStudent,
  totalActivityMarks,
  computeActivityFlagsByStudent,
  resolveStudentReportStatus,
  resolveAssignmentItemStatus,
  resolveQuizItemStatus,
  REPORT_STATUS,
} from './courseReportShared.js';

function quizWeight(q) {
  const planTotal = q.marksPlan?.totalMarks;
  if (q.maxMarks > 0) return q.maxMarks;
  if (Number.isInteger(planTotal) && planTotal > 0) return planTotal;
  return 0;
}

const LIST_INCLUDE = {
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
      batch: { select: { id: true, name: true } },
      studentRegistrations: {
        select: {
          student: { select: { id: true, full_name: true, number: true } },
        },
      },
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
};

const GRADE_SORT_KEYS = new Set(['overallMarks', 'overallPct']);

function parseSort(raw) {
  const s = typeof raw === 'string' && raw ? raw : 'studentName-asc';
  const [key, dir] = s.split('-');
  return { key: key || 'studentName', dir: dir === 'desc' ? 'desc' : 'asc' };
}

function sortRows(rows, { key, dir }) {
  const mult = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) {
      return String(a.studentName ?? '').localeCompare(String(b.studentName ?? '')) * mult;
    }
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    return String(av ?? '').localeCompare(String(bv ?? '')) * mult;
  });
}

function matchesStudentSearch(row, q) {
  if (!q) return true;
  const hay = [
    row.studentName,
    row.studentNumber,
    row.courseCode,
    row.courseName,
    row.section,
    row.batch,
    row.department,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
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
    const maxMarksByAssignmentId = new Map(
      o.assignments.map((a) => [a.id, a.maxMarks || 10])
    );
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

function buildCandidateRows(offerings) {
  const rows = [];
  for (const o of offerings) {
    const students = o.section.studentRegistrations.map((r) => r.student);
    for (const student of students) {
      rows.push({
        _dbOfferingId: o.id,
        id: `${o.publicId}:${student.id}`,
        studentId: student.id,
        studentName: student.full_name,
        studentNumber: student.number ?? null,
        offeringId: o.publicId,
        courseCode: o.course.code,
        courseName: o.course.name,
        department: o.course.department?.name ?? null,
        section: o.section.name,
        batch: o.section.batch?.name ?? null,
        batchId: o.section.batch?.id ?? null,
        overallMarks: null,
        overallPct: null,
        courseMaxMarks: o.course?.maxMarks ?? 100,
        status: REPORT_STATUS.NOT_SUBMITTED,
      });
    }
  }
  return rows;
}

function applyMarks(row, marksByStudent, courseMaxMarks, flagsLookup) {
  const mark = marksByStudent.get(row.studentId);
  const overallPct = mark?.pct ?? null;
  const overallMarks = mark?.earned ?? null;
  const flags = flagsLookup?.forStudent?.(row.studentId) ?? {
    hasUngradedWork: false,
    hasMissingPastDue: false,
  };

  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName,
    studentNumber: row.studentNumber,
    offeringId: row.offeringId,
    courseCode: row.courseCode,
    courseName: row.courseName,
    department: row.department,
    section: row.section,
    batch: row.batch,
    batchId: row.batchId,
    overallMarks,
    overallPct: overallPct == null ? null : Math.round(overallPct * 10) / 10,
    courseMaxMarks,
    status: resolveStudentReportStatus(mark, flags),
  };
}

function flagsForOffering(offering, gradeBundle, cache) {
  const key = offering?.id ?? gradeBundle;
  if (cache.has(key)) return cache.get(key);
  const flags = computeActivityFlagsByStudent({
    assignments: offering?.assignments ?? [],
    quizzes: offering?.quizzes ?? [],
    submissions: gradeBundle.submissions ?? [],
    attempts: gradeBundle.attempts ?? [],
  });
  cache.set(key, flags);
  return flags;
}

/**
 * GET /api/lecturer-portal/student-reports
 * Paginated student×course rows. Query: page, pageSize, q, department, courseId, studentId, sort, from, to
 */
export async function listStudentReports(req, res) {
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
    const studentIdRaw =
      typeof req.query.studentId === 'string' && req.query.studentId !== 'all'
        ? req.query.studentId.trim()
        : '';
    const studentIdFilter = studentIdRaw ? Number(studentIdRaw) : null;
    const sort = parseSort(req.query.sort);
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 25,
      maxPageSize: 1000,
    });

    const offerings = await findTeacherOfferings(req.user, LIST_INCLUDE);
    let rows = buildCandidateRows(offerings);

    const filterOptions = {
      departments: [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(),
      batches: [
        ...new Map(
          rows
            .filter((r) => r.batch)
            .map((r) => [r.batch, { id: String(r.batchId ?? r.batch), name: r.batch }])
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
      sections: [...new Set(rows.map((r) => r.section).filter(Boolean))].sort(),
      courses: [
        ...new Map(
          offerings.map((o) => [
            o.publicId,
            {
              id: o.publicId,
              label: `${o.course.code} — ${o.course.name}`,
              department: o.course.department?.name ?? null,
              section: o.section.name,
              batch: o.section.batch?.name ?? null,
            },
          ])
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
      students: [
        ...new Map(
          rows.map((r) => [
            String(r.studentId),
            {
              id: String(r.studentId),
              name: r.studentName,
              number: r.studentNumber,
              department: r.department,
            },
          ])
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    };

    rows = rows.filter((r) => {
      if (department && (r.department ?? '') !== department) return false;
      if (courseId && r.offeringId !== courseId) return false;
      if (studentIdFilter && r.studentId !== studentIdFilter) return false;
      if (!matchesStudentSearch(r, q)) return false;
      return true;
    });

    const needsGradeSort = GRADE_SORT_KEYS.has(sort.key);
    const offeringById = new Map(offerings.map((o) => [o.id, o]));

    if (needsGradeSort) {
      const neededOfferingIds = [...new Set(rows.map((r) => r._dbOfferingId))];
      const neededOfferings = neededOfferingIds
        .map((id) => offeringById.get(id))
        .filter(Boolean);
      const gradesByOffering = await loadGradesForOfferings(neededOfferings, { from, to });
      const flagsCache = new Map();
      rows = rows.map((r) => {
        const offering = offeringById.get(r._dbOfferingId);
        const gradeBundle = gradesByOffering.get(r._dbOfferingId) ?? {
          submissions: [],
          attempts: [],
          maxMarksByAssignmentId: new Map(),
          quizWeightById: new Map(),
          courseMaxMarks: r.courseMaxMarks,
        };
        const marksByStudent = overallMarksByStudent(gradeBundle);
        const flagsLookup = flagsForOffering(offering, gradeBundle, flagsCache);
        return applyMarks(r, marksByStudent, gradeBundle.courseMaxMarks, flagsLookup);
      });
      rows = sortRows(rows, sort);
      const total = rows.length;
      return res.json({
        generatedAt: new Date().toISOString(),
        rows: rows.slice(skip, skip + pageSize),
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
    const neededOfferingIds = [...new Set(pageMeta.map((r) => r._dbOfferingId))];
    const neededOfferings = neededOfferingIds
      .map((id) => offeringById.get(id))
      .filter(Boolean);
    const gradesByOffering = await loadGradesForOfferings(neededOfferings, { from, to });
    const flagsCache = new Map();

    const pageRows = pageMeta.map((r) => {
      const offering = offeringById.get(r._dbOfferingId);
      const gradeBundle = gradesByOffering.get(r._dbOfferingId) ?? {
        submissions: [],
        attempts: [],
        maxMarksByAssignmentId: new Map(),
        quizWeightById: new Map(),
        courseMaxMarks: r.courseMaxMarks,
      };
      const marksByStudent = overallMarksByStudent(gradeBundle);
      const flagsLookup = flagsForOffering(offering, gradeBundle, flagsCache);
      return applyMarks(r, marksByStudent, gradeBundle.courseMaxMarks, flagsLookup);
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
    respondInternalError(res, 'Failed to list student reports', e);
  }
}

/**
 * GET /api/lecturer-portal/student-reports/:studentId
 * One student within one offering (?offeringId=publicId required).
 */
export async function getStudentReport(req, res) {
  try {
    const userId = Number(req.user.sub);
    if (!userId) return res.status(401).json({ message: 'Invalid user context' });

    const studentId = Number(req.params.studentId);
    const offeringPublicId = String(req.query.offeringId || '');
    if (!studentId || !offeringPublicId) {
      return res.status(400).json({ message: 'studentId and offeringId are required' });
    }

    const offering = await findTeacherOfferingByPublicId(req.user, offeringPublicId, {
      ...LIST_INCLUDE,
      assignments: {
        where: { lifecycle: { publishStatus: 'PUBLISHED' } },
        orderBy: { due_date: 'asc' },
        select: { id: true, title: true, due_date: true, maxMarks: true },
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
        select: { id: true, title: true, type: true },
      },
    });
    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    const student = offering.section.studentRegistrations
      .map((r) => r.student)
      .find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not in this course section' });
    }

    const gradesByOffering = await loadGradesForOfferings([offering]);
    const gradeBundle = gradesByOffering.get(offering.id) ?? {
      submissions: [],
      attempts: [],
      maxMarksByAssignmentId: new Map(),
      quizWeightById: new Map(),
      courseMaxMarks: 0,
    };
    const marksByStudent = overallMarksByStudent(gradeBundle);
    const mark = marksByStudent.get(studentId);
    const overallPct = mark?.pct ?? null;
    const overallMarks = mark?.earned ?? null;
    const flagsLookup = computeActivityFlagsByStudent({
      assignments: offering.assignments,
      quizzes: offering.quizzes,
      submissions: gradeBundle.submissions,
      attempts: gradeBundle.attempts,
    });

    const submissionByAssignment = new Map();
    for (const s of gradeBundle.submissions) {
      if (s.studentId !== studentId) continue;
      // Prefer graded submission if multiple exist.
      const prev = submissionByAssignment.get(s.assignmentId);
      if (!prev || (prev.gradeRow?.score == null && s.gradeRow?.score != null)) {
        submissionByAssignment.set(s.assignmentId, s);
      }
    }
    const attemptByQuiz = new Map();
    for (const a of gradeBundle.attempts) {
      if (a.studentId !== studentId) continue;
      const prev = attemptByQuiz.get(a.quizId);
      const pct = a.grade ?? a.score ?? null;
      const prevPct = prev ? prev.grade ?? prev.score ?? null : null;
      if (!prev || (prevPct == null && pct != null) || (pct != null && prevPct != null && pct > prevPct)) {
        attemptByQuiz.set(a.quizId, a);
      }
    }

    res.json({
      generatedAt: new Date().toISOString(),
      student: {
        studentId: student.id,
        name: student.full_name,
        number: student.number ?? null,
        overallMarks,
        overallPct: overallPct == null ? null : Math.round(overallPct * 10) / 10,
        status: resolveStudentReportStatus(mark, flagsLookup.forStudent(studentId)),
      },
      course: {
        id: offering.publicId,
        courseCode: offering.course.code,
        courseName: offering.course.name,
        department: offering.course.department?.name ?? null,
        section: offering.section.name,
        batch: offering.section.batch?.name ?? null,
      },
      classSummary: {
        courseMaxMarks: gradeBundle.courseMaxMarks,
      },
      content: {
        quizzes: offering.quizzes.length,
        assignments: offering.assignments.length,
        resources: offering.resources?.length ?? 0,
        quizItems: offering.quizzes.map((q) => {
          const item = resolveQuizItemStatus({
            close_at: q.close_at,
            maxMarks: q.maxMarks,
            marksPlan: q.marksPlan,
            attempt: attemptByQuiz.get(q.id) ?? null,
          });
          return {
            id: q.id,
            title: q.title,
            dueAt: q.close_at?.toISOString?.() ?? q.close_at ?? null,
            status: item.status,
            score: item.score,
            maxMarks: item.maxMarks,
          };
        }),
        assignmentItems: offering.assignments.map((a) => {
          const item = resolveAssignmentItemStatus({
            due_date: a.due_date,
            maxMarks: a.maxMarks,
            submission: submissionByAssignment.get(a.id) ?? null,
          });
          return {
            id: a.id,
            title: a.title,
            dueAt: a.due_date?.toISOString?.() ?? a.due_date ?? null,
            status: item.status,
            score: item.score,
            maxMarks: item.maxMarks,
          };
        }),
        resourceItems: (offering.resources ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    respondInternalError(res, 'Failed to build student report', e);
  }
}
