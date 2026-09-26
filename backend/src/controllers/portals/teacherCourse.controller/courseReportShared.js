import { prisma } from '../../../db/prisma.js';
import { ensureTeacherOfferings } from '../../../services/academic/ensureTeacherOfferings.js';
import { resolveActiveAcademicTerm } from '../../../services/academic/resolveActiveAcademicTerm.js';

function roleName(user) {
  if (typeof user?.role === 'string') return user.role;
  return user?.role?.name ? String(user.role.name) : '';
}

function asUserContext(userOrId) {
  if (userOrId && typeof userOrId === 'object') return userOrId;
  return { sub: Number(userOrId), role: 'TEACHER' };
}

/** Faculty-scoped offerings (dean reports). Same path as dean-reports helpers. */
function facultyOfferingWhere(facultyId) {
  return {
    section: { batch: { program: { department: { facultyId } } } },
  };
}

/** Teacher access: offerings they teach or are assigned to. */
export async function resolveTeacherOfferingAccess(userId) {
  await ensureTeacherOfferings(userId);

  const assignings = await prisma.teacherAssigning.findMany({
    where: { teacherId: userId },
    select: { courseId: true },
  });
  const assignedCourseIds = [...new Set(assignings.map((a) => a.courseId))];

  const accessOr = [{ teacherId: userId }];
  if (assignedCourseIds.length > 0) {
    accessOr.push({ courseId: { in: assignedCourseIds } });
  }

  const activeTerm = await resolveActiveAcademicTerm({ includeDb: true });
  return { accessOr, academicYearId: activeTerm.academicYearId ?? null };
}

/**
 * Course/student report access for TEACHER (own), DEAN (faculty), SUPER_ADMIN (all).
 * @param {object|number} userOrId — req.user or legacy teacher userId
 */
export async function resolveReportOfferingAccess(userOrId) {
  const user = asUserContext(userOrId);
  const userId = Number(user.sub ?? user.id);
  const role = roleName(user);
  const facultyId = Number(user.facultyId) || null;
  const activeTerm = await resolveActiveAcademicTerm({ includeDb: true });
  const academicYearId = activeTerm.academicYearId ?? null;

  if (role === 'DEAN') {
    if (!facultyId) return { where: { id: -1 }, academicYearId };
    return { where: facultyOfferingWhere(facultyId), academicYearId };
  }

  if (role === 'SUPER_ADMIN') {
    return { where: {}, academicYearId };
  }

  const { accessOr } = await resolveTeacherOfferingAccess(userId);
  return { where: { OR: accessOr }, academicYearId };
}

/**
 * @param {{ allYears?: boolean }} [opts] allYears skips the active-academic-year
 *   scoping so older-year offerings (e.g. an "All time" report) are included.
 */
export async function findTeacherOfferings(userOrId, include, { allYears = false } = {}) {
  const { where, academicYearId } = await resolveReportOfferingAccess(userOrId);

  if (academicYearId && !allYears) {
    const scoped = await prisma.courseOffering.findMany({
      where: { ...where, academicYearId },
      include,
    });
    if (scoped.length > 0) return scoped;
  }

  return prisma.courseOffering.findMany({
    where,
    include,
  });
}

export async function findTeacherOfferingByPublicId(userOrId, publicId, include) {
  const { where } = await resolveReportOfferingAccess(userOrId);
  return prisma.courseOffering.findFirst({
    where: { publicId, ...where },
    include,
  });
}

/** Fail threshold matches dean/teacher report bands (< 60% = Fail). */
export const FAIL_PCT = 60;

/** Student report / course-report roster statuses. */
export const REPORT_STATUS = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  NO_GRADE: 'No grade',
  MISSING: 'Missing',
  NOT_SUBMITTED: 'Not submitted',
};

/**
 * Resolve display status for one student in an offering.
 * Priority: graded → Failed/Passed; else ungraded work → No grade;
 * else past-due without work → Missing; else Not submitted.
 */
export function resolveStudentReportStatus(marksRow, flags = {}) {
  if (marksRow?.pct != null) {
    return marksRow.pct < FAIL_PCT ? REPORT_STATUS.FAILED : REPORT_STATUS.PASSED;
  }
  if (flags.hasUngradedWork) return REPORT_STATUS.NO_GRADE;
  if (flags.hasMissingPastDue) return REPORT_STATUS.MISSING;
  return REPORT_STATUS.NOT_SUBMITTED;
}

/** Per-assignment status for one student. */
export function resolveAssignmentItemStatus({
  due_date = null,
  maxMarks = 10,
  submission = null,
  now = new Date(),
} = {}) {
  const max = maxMarks || 10;
  const score = submission?.gradeRow?.score ?? null;
  if (score != null) {
    const pct = max > 0 ? (Number(score) / max) * 100 : null;
    return {
      status:
        pct != null && pct < FAIL_PCT ? REPORT_STATUS.FAILED : REPORT_STATUS.PASSED,
      score: Math.round(Number(score) * 10) / 10,
      maxMarks: max,
    };
  }
  if (submission) {
    return { status: REPORT_STATUS.NO_GRADE, score: null, maxMarks: max };
  }
  if (due_date && new Date(due_date).getTime() < now.getTime()) {
    return { status: REPORT_STATUS.MISSING, score: null, maxMarks: max };
  }
  return { status: REPORT_STATUS.NOT_SUBMITTED, score: null, maxMarks: max };
}

/** Per-quiz status for one student (attempt grade/score is a percentage 0–100). */
export function resolveQuizItemStatus({
  close_at = null,
  maxMarks = 0,
  marksPlan = null,
  attempt = null,
  now = new Date(),
} = {}) {
  const planTotal = marksPlan?.totalMarks;
  let weight = 0;
  if (maxMarks > 0) weight = maxMarks;
  else if (Number.isInteger(planTotal) && planTotal > 0) weight = planTotal;

  const pct = attempt?.grade ?? attempt?.score ?? null;
  if (pct != null) {
    const earned =
      weight > 0 ? Math.round((Number(pct) / 100) * weight * 10) / 10 : Number(pct);
    return {
      status: Number(pct) < FAIL_PCT ? REPORT_STATUS.FAILED : REPORT_STATUS.PASSED,
      score: weight > 0 ? earned : Math.round(Number(pct) * 10) / 10,
      maxMarks: weight > 0 ? weight : 100,
    };
  }
  if (attempt) {
    return {
      status: REPORT_STATUS.NO_GRADE,
      score: null,
      maxMarks: weight > 0 ? weight : null,
    };
  }
  if (close_at && new Date(close_at).getTime() < now.getTime()) {
    return {
      status: REPORT_STATUS.MISSING,
      score: null,
      maxMarks: weight > 0 ? weight : null,
    };
  }
  return {
    status: REPORT_STATUS.NOT_SUBMITTED,
    score: null,
    maxMarks: weight > 0 ? weight : null,
  };
}

/**
 * Per-student activity flags from submissions/attempts + due dates.
 * Call `.forStudent(id)` for each roster member.
 */
export function computeActivityFlagsByStudent({
  assignments = [],
  quizzes = [],
  submissions = [],
  attempts = [],
  now = new Date(),
} = {}) {
  const nowMs = now.getTime();
  const pastDueAssignments = assignments.filter(
    (a) => a.due_date && new Date(a.due_date).getTime() < nowMs
  );
  const pastDueQuizzes = quizzes.filter(
    (q) => q.close_at && new Date(q.close_at).getTime() < nowMs
  );

  const submittedAsg = new Map();
  const attemptedQuiz = new Map();
  const ungraded = new Set();

  for (const s of submissions) {
    if (!submittedAsg.has(s.studentId)) submittedAsg.set(s.studentId, new Set());
    submittedAsg.get(s.studentId).add(s.assignmentId);
    if (s.gradeRow?.score == null) ungraded.add(s.studentId);
  }
  for (const a of attempts) {
    if (!attemptedQuiz.has(a.studentId)) attemptedQuiz.set(a.studentId, new Set());
    attemptedQuiz.get(a.studentId).add(a.quizId);
    if (a.grade == null && a.score == null) ungraded.add(a.studentId);
  }

  return {
    forStudent(studentId) {
      const asgSet = submittedAsg.get(studentId) ?? new Set();
      const quizSet = attemptedQuiz.get(studentId) ?? new Set();
      let hasMissingPastDue = false;
      for (const a of pastDueAssignments) {
        if (!asgSet.has(a.id)) {
          hasMissingPastDue = true;
          break;
        }
      }
      if (!hasMissingPastDue) {
        for (const q of pastDueQuizzes) {
          if (!quizSet.has(q.id)) {
            hasMissingPastDue = true;
            break;
          }
        }
      }
      return {
        hasUngradedWork: ungraded.has(studentId),
        hasMissingPastDue,
      };
    },
  };
}

/** Sum of published assignment maxMarks + quiz weights for an offering. */
export function totalActivityMarks({
  maxMarksByAssignmentId = new Map(),
  quizWeightById = new Map(),
} = {}) {
  let total = 0;
  for (const v of maxMarksByAssignmentId.values()) total += Number(v) || 0;
  for (const v of quizWeightById.values()) total += Number(v) || 0;
  return total;
}

/**
 * Per-student overall marks — same model as the gradebook:
 * sum of assignment raw scores + best quiz attempt scaled by quiz weight.
 * Percentage uses total activity marks (assignments + quizzes), not Course.maxMarks.
 * @returns {Map<number, { earned: number, pct: number | null }>}
 */
export function overallMarksByStudent({
  submissions,
  attempts,
  courseMaxMarks = 0,
  quizWeightById = new Map(),
  maxMarksByAssignmentId = new Map(),
}) {
  const earnedByStudent = new Map();
  const gradedByStudent = new Map();

  for (const s of submissions) {
    const rawGrade = s.gradeRow?.score ?? null;
    if (rawGrade == null) continue;
    gradedByStudent.set(s.studentId, true);
    earnedByStudent.set(
      s.studentId,
      (earnedByStudent.get(s.studentId) ?? 0) + Number(rawGrade)
    );
  }

  const bestQuizByKey = new Map();
  for (const a of attempts) {
    const pct = a.grade ?? a.score ?? null;
    if (pct == null) continue;
    const key = `${a.quizId}:${a.studentId}`;
    const prev = bestQuizByKey.get(key);
    if (prev == null || pct > prev) bestQuizByKey.set(key, pct);
  }

  for (const [key, pct] of bestQuizByKey) {
    const [quizIdStr, studentIdStr] = key.split(':');
    const studentId = Number(studentIdStr);
    const weight = quizWeightById.get(Number(quizIdStr)) || 0;
    if (weight <= 0) continue;
    gradedByStudent.set(studentId, true);
    earnedByStudent.set(
      studentId,
      (earnedByStudent.get(studentId) ?? 0) + (pct / 100) * weight
    );
  }

  const activityTotal = totalActivityMarks({ maxMarksByAssignmentId, quizWeightById });
  const max = activityTotal > 0 ? activityTotal : courseMaxMarks > 0 ? courseMaxMarks : 0;
  const out = new Map();
  for (const studentId of gradedByStudent.keys()) {
    const earned = Math.round((earnedByStudent.get(studentId) ?? 0) * 10) / 10;
    out.set(studentId, {
      earned,
      pct: max > 0 ? (earned / max) * 100 : null,
    });
  }
  return out;
}

/** @deprecated Prefer overallMarksByStudent — kept for callers that only need %. */
export function overallPctByStudent(args) {
  const marks = overallMarksByStudent(args);
  const out = new Map();
  for (const [studentId, row] of marks) {
    if (row.pct != null) out.set(studentId, row.pct);
  }
  return out;
}

export function summarizeStudentOutcomes(students, marksByStudent, courseMaxMarks = 0, flagsLookup = null) {
  let sumPct = 0;
  let sumMarks = 0;
  let graded = 0;
  let failed = 0;
  let passed = 0;
  let noGrade = 0;
  let missing = 0;
  let notSubmitted = 0;
  const failedStudents = [];

  for (const student of students) {
    const row = marksByStudent.get(student.id);
    const flags = flagsLookup?.forStudent?.(student.id) ?? {
      hasUngradedWork: false,
      hasMissingPastDue: false,
    };
    const status = resolveStudentReportStatus(row, flags);

    if (status === REPORT_STATUS.PASSED || status === REPORT_STATUS.FAILED) {
      graded += 1;
      sumPct += row.pct;
      sumMarks += row.earned;
      if (status === REPORT_STATUS.FAILED) {
        failed += 1;
        failedStudents.push({
          studentId: student.id,
          name: student.full_name,
          number: student.number ?? null,
          overallPct: Math.round(row.pct * 10) / 10,
          overallMarks: row.earned,
        });
      } else {
        passed += 1;
      }
      continue;
    }
    if (status === REPORT_STATUS.NO_GRADE) noGrade += 1;
    else if (status === REPORT_STATUS.MISSING) missing += 1;
    else notSubmitted += 1;
  }

  failedStudents.sort((a, b) => a.overallMarks - b.overallMarks);

  return {
    gradedCount: graded,
    passedCount: passed,
    failedCount: failed,
    noGradeCount: noGrade,
    missingCount: missing,
    notSubmittedCount: notSubmitted,
    ungradedCount: noGrade + missing + notSubmitted,
    avgOverallPct: graded ? Math.round((sumPct / graded) * 10) / 10 : null,
    avgOverallMarks: graded ? Math.round((sumMarks / graded) * 10) / 10 : null,
    courseMaxMarks,
    failedStudents,
  };
}
