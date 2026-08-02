import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import {
  getCloseAtMs,
  pickEffectiveDue,
} from '../../../features/assignments/lifecycleCore.js';
import { publishedAssignmentWhere } from '../../../features/assignments/lifecycleService.js';

const router = Router();

function percentOfMax(grade, maxMarks) {
  const cap = maxMarks > 0 ? maxMarks : 100;
  return (grade / cap) * 100;
}

router.get(
  '/course/:courseOfferingId/my-summary',
  requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const studentId = req.user.id ?? req.user.sub;
    const now = Date.now();

    const [assignments, submissions, extensions] = await Promise.all([
      prisma.assignment.findMany({
        where: { courseOfferingId, ...publishedAssignmentWhere },
        select: {
          id: true,
          due_date: true,
          lateWindowMinutes: true,
          maxMarks: true,
        },
      }),
      prisma.submission.findMany({
        where: {
          studentId,
          assignment: { courseOfferingId, ...publishedAssignmentWhere },
        },
        select: {
          id: true,
          assignmentId: true,
          lateState: true,
          gradeRow: { select: { score: true } },
          groupId: true,
        },
      }),
      prisma.submissionExtension.findMany({
        where: {
          assignment: { courseOfferingId },
          OR: [{ studentId }, { groupId: { not: null } }],
        },
        select: { assignmentId: true, studentId: true, groupId: true, newDueAt: true },
      }),
    ]);

    const assignmentById = new Map(assignments.map((a) => [a.id, a]));
    const submittedIds = new Set(submissions.map((s) => s.assignmentId));
    const gradedSubmissions = submissions.filter(
      (s) => s.gradeRow != null && typeof s.gradeRow.score === 'number',
    );
    const lateCount = submissions.filter((s) => s.lateState === 'LATE').length;

    const extByAssignment = new Map();
    for (const e of extensions) {
      if (e.studentId === studentId) {
        extByAssignment.set(e.assignmentId, e.newDueAt);
      }
    }
    for (const s of submissions) {
      if (s.groupId == null) continue;
      const gExt = extensions.find(
        (e) => e.assignmentId === s.assignmentId && e.groupId === s.groupId,
      );
      if (gExt) {
        const cur = extByAssignment.get(s.assignmentId);
        extByAssignment.set(
          s.assignmentId,
          pickEffectiveDue(cur ?? assignmentById.get(s.assignmentId)?.due_date, gExt.newDueAt),
        );
      }
    }

    const missingCount = assignments.filter((a) => {
      if (submittedIds.has(a.id)) return false;
      const effectiveDue = pickEffectiveDue(a.due_date, extByAssignment.get(a.id));
      return getCloseAtMs(effectiveDue, a.lateWindowMinutes) < now;
    }).length;

    const avgGrade = gradedSubmissions.length
      ? Math.round(
          (gradedSubmissions.reduce((sum, s) => {
            const max = assignmentById.get(s.assignmentId)?.maxMarks ?? 100;
            return sum + percentOfMax(s.gradeRow.score, max);
          }, 0) /
            gradedSubmissions.length) *
            10,
        ) / 10
      : null;

    res.json({
      totalPublished: assignments.length,
      submittedCount: submissions.length,
      gradedCount: gradedSubmissions.length,
      lateCount,
      missingCount,
      avgGrade,
    });
  }),
);

export default router;
