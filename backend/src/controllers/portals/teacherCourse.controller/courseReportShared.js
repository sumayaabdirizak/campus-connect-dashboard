import { prisma } from '../../../db/prisma.js';
import { ensureTeacherOfferings } from '../../../services/academic/ensureTeacherOfferings.js';
import { resolveActiveAcademicTerm } from '../../../services/academic/resolveActiveAcademicTerm.js';

/** Same access rule as getMyCourses / grading workload. */
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

export async function findTeacherOfferings(userId, include) {
  const { accessOr, academicYearId } = await resolveTeacherOfferingAccess(userId);

  if (academicYearId) {
    const scoped = await prisma.courseOffering.findMany({
      where: { OR: accessOr, academicYearId },
      include,
    });
    if (scoped.length > 0) return scoped;
  }

  return prisma.courseOffering.findMany({
    where: { OR: accessOr },
    include,
  });
}

export async function findTeacherOfferingByPublicId(userId, publicId, include) {
  const { accessOr } = await resolveTeacherOfferingAccess(userId);
  return prisma.courseOffering.findFirst({
    where: { publicId, OR: accessOr },
    include,
  });
}

/** Fail threshold matches dean/teacher report bands (< 60% = Fail). */
export const FAIL_PCT = 60;

/**
 * Build per-student overall % from graded assignment submissions + quiz attempts.
 * @returns {Map<number, number>} studentId -> overallPct
 */
export function overallPctByStudent({ submissions, attempts, maxMarksByAssignmentId }) {
  const subByStudent = new Map();

  for (const s of submissions) {
    const rawGrade = s.gradeRow?.score ?? null;
    if (rawGrade == null) continue;
    const maxMarks = maxMarksByAssignmentId.get(s.assignmentId) || 100;
    const list = subByStudent.get(s.studentId) ?? [];
    list.push((rawGrade / maxMarks) * 100);
    subByStudent.set(s.studentId, list);
  }

  for (const a of attempts) {
    const pct = a.grade ?? a.score ?? null;
    if (pct == null) continue;
    const list = subByStudent.get(a.studentId) ?? [];
    list.push(pct);
    subByStudent.set(a.studentId, list);
  }

  const out = new Map();
  for (const [studentId, pcts] of subByStudent) {
    if (!pcts.length) continue;
    out.set(studentId, pcts.reduce((sum, p) => sum + p, 0) / pcts.length);
  }
  return out;
}

export function summarizeStudentOutcomes(students, pctByStudent) {
  let sum = 0;
  let graded = 0;
  let failed = 0;
  let passed = 0;
  const failedStudents = [];

  for (const student of students) {
    const overallPct = pctByStudent.get(student.id);
    if (overallPct == null) continue;
    graded += 1;
    sum += overallPct;
    if (overallPct < FAIL_PCT) {
      failed += 1;
      failedStudents.push({
        studentId: student.id,
        name: student.full_name,
        number: student.number ?? null,
        overallPct: Math.round(overallPct * 10) / 10,
      });
    } else {
      passed += 1;
    }
  }

  failedStudents.sort((a, b) => a.overallPct - b.overallPct);

  return {
    gradedCount: graded,
    passedCount: passed,
    failedCount: failed,
    ungradedCount: Math.max(0, students.length - graded),
    avgOverallPct: graded ? Math.round((sum / graded) * 10) / 10 : null,
    failedStudents,
  };
}
