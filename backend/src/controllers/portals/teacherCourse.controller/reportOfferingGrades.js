import { prisma } from '../../../db/prisma.js';
import {
  totalActivityMarks,
  overallMarksByStudent,
  summarizeStudentOutcomes,
  computeActivityFlagsByStudent,
} from './courseReportShared.js';

function quizWeight(q) {
  const planTotal = q.marksPlan?.totalMarks;
  if (q.maxMarks > 0) return q.maxMarks;
  if (Number.isInteger(planTotal) && planTotal > 0) return planTotal;
  return 0;
}

/** Load submissions/attempts and mark weights per offering (optional from/to on submitted_at). */
export async function loadGradesForOfferings(offerings, { from = null, to = null } = {}) {
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

export function enrichWithOutcomes(offering, gradeBundle) {
  const students = (offering.section?.studentRegistrations ?? []).map((r) => r.student);
  const marksByStudent = overallMarksByStudent(gradeBundle);
  const flagsLookup = computeActivityFlagsByStudent({
    assignments: offering.assignments ?? [],
    quizzes: offering.quizzes ?? [],
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

export function roleName(user) {
  if (typeof user?.role === 'string') return user.role;
  return user?.role?.name ? String(user.role.name) : '';
}

/** Lecturer/batch aggregate reports are for faculty staff, not classroom teachers. */
export function assertFacultyAggregateAccess(req, res) {
  const role = roleName(req.user);
  if (role !== 'DEAN' && role !== 'SUPER_ADMIN') {
    res.status(403).json({ message: 'Forbidden' });
    return false;
  }
  return true;
}

export function parseSort(raw, fallback = 'name-asc') {
  const s = typeof raw === 'string' && raw ? raw : fallback;
  const [key, dir] = s.split('-');
  return { key: key || fallback.split('-')[0], dir: dir === 'desc' ? 'desc' : 'asc' };
}

export function sortRows(rows, { key, dir }) {
  const mult = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1 * mult;
    if (bv == null) return -1 * mult;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
    return String(av ?? '').localeCompare(String(bv ?? '')) * mult;
  });
}

export function averageNullable(values) {
  const nums = values.filter((v) => v != null && !Number.isNaN(Number(v))).map(Number);
  if (!nums.length) return null;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}

export const OFFERING_REPORT_INCLUDE = {
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
      id: true,
      name: true,
      batchId: true,
      batch: {
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
        },
      },
      studentRegistrations: {
        select: { student: { select: { id: true, full_name: true, number: true } } },
      },
      _count: { select: { studentRegistrations: true } },
    },
  },
  teacher: {
    select: {
      id: true,
      full_name: true,
      number: true,
      lecturerProfile: {
        select: { department: { select: { name: true } } },
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
  resources: {
    where: { is_draft: false, status: 'APPROVED' },
    select: { id: true },
  },
};
