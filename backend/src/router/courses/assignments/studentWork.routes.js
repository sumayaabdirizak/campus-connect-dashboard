import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import {
  getCloseAtMs,
  pickEffectiveDue,
} from '../../../services/assignments/lifecycleCore.js';
import { publishedAssignmentWhere } from '../../../services/assignments/lifecycleService.js';
import { toSubmissionClient } from '../../../services/assignments/submissionDto.js';

const router = Router();

router.get(
  '/course/:courseOfferingId/students/:studentId/work',
  requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const studentId = parseInt(req.params.studentId, 10);
    if (!Number.isInteger(studentId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const now = Date.now();
    const [assignments, submissions, extensions, quizAttempts] = await Promise.all([
      prisma.assignment.findMany({
        where: { courseOfferingId, ...publishedAssignmentWhere },
        select: {
          id: true,
          title: true,
          due_date: true,
          gradingScope: true,
          maxMarks: true,
          lateWindowMinutes: true,
        },
        orderBy: { due_date: 'asc' },
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
          submitted_at: true,
          content_url: true,
          groupId: true,
          gradeRow: true,
        },
        orderBy: { submitted_at: 'desc' },
      }),
      prisma.submissionExtension.findMany({
        where: {
          assignment: { courseOfferingId },
          OR: [{ studentId }, { groupId: { not: null } }],
        },
        select: { assignmentId: true, studentId: true, groupId: true, newDueAt: true },
      }),
      prisma.quizAttempt.findMany({
        where: {
          studentId,
          quiz: { courseOfferingId },
        },
        select: {
          id: true,
          quizId: true,
          score: true,
          grade: true,
          submitted_at: true,
          quiz: { select: { id: true, title: true, passing_score: true, maxMarks: true } },
        },
        orderBy: { submitted_at: 'desc' },
      }),
    ]);

    const assignmentById = new Map(assignments.map((a) => [a.id, a]));
    const submittedIds = new Set(submissions.map((s) => s.assignmentId));
    const extByAssignment = new Map();
    for (const e of extensions) {
      if (e.studentId === studentId) extByAssignment.set(e.assignmentId, e.newDueAt);
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

    const clientSubs = submissions.map(toSubmissionClient);
    const lateCount = clientSubs.filter((s) => s.is_late).length;
    const graded = clientSubs.filter((s) => typeof s.grade === 'number');
    const avgGrade =
      graded.length > 0
        ? Math.round(
            (graded.reduce((sum, s) => {
              const max = assignmentById.get(s.assignmentId)?.maxMarks ?? 100;
              return sum + ((s.grade ?? 0) / (max > 0 ? max : 100)) * 100;
            }, 0) /
              graded.length) *
              10,
          ) / 10
        : null;

    res.json({
      assignments,
      submissions: clientSubs,
      quizAttempts,
      stats: {
        totalAssignments: assignments.length,
        submittedCount: submissions.length,
        missingCount,
        lateCount,
        gradedCount: graded.length,
        avgGrade,
      },
    });
  }),
);

export default router;
