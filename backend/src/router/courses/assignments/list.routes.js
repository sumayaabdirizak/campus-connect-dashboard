import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import { attachmentInclude } from '../../../controllers/courses/assignments/shared.js';
import { loadStudentExtensionsForAssignments } from '../../../controllers/courses/assignments/mySubmissionHelpers.js';
import {
  enrichAssignmentDto,
  publishedAssignmentWhere,
} from '../../../services/assignments/lifecycleService.js';

const router = Router();

router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const isStudent = req.user?.role === 'STUDENT';
  const studentId = Number(req.user?.id ?? req.user?.sub) || null;

  const assignments = await prisma.assignment.findMany({
    where: {
      courseOfferingId: req.courseOffering.id,
      ...(isStudent ? publishedAssignmentWhere : {}),
    },
    include: {
      lifecycle: true,
      ...(isStudent && studentId
        ? {
            submissions: {
              where: { studentId },
              select: {
                id: true,
                studentId: true,
                gradeRow: { select: { score: true, feedback: true, gradedAt: true } },
              },
            },
          }
        : {}),
      ...attachmentInclude,
      _count: { select: { submissions: true } },
    },
    orderBy: { due_date: 'asc' },
  });

  let pendingByAssignment = new Map();
  if (!isStudent && assignments.length > 0) {
    const pending = await prisma.submission.groupBy({
      by: ['assignmentId'],
      where: {
        assignmentId: { in: assignments.map((a) => a.id) },
        gradeRow: { is: null },
      },
      _count: { _all: true },
    });
    pendingByAssignment = new Map(pending.map((p) => [p.assignmentId, p._count._all]));
  }

  let extensionByAssignmentId = new Map();
  if (isStudent && studentId && assignments.length > 0) {
    extensionByAssignmentId = await loadStudentExtensionsForAssignments(
      req.courseOffering.id,
      studentId,
      assignments.map((a) => ({ id: a.id, due_date: a.due_date })),
    );
  }

  res.json(
    assignments.map((a) => {
      const enriched = enrichAssignmentDto(a);
      const subs = a.submissions ?? [];
      const studentExtension = extensionByAssignmentId.get(a.id) ?? null;
      return {
        ...enriched,
        ...(studentExtension ? { _extension: studentExtension } : {}),
        submissions: subs.map((s) => ({
          id: s.id,
          studentId: s.studentId,
          grade: s.gradeRow?.score ?? null,
          is_reviewed: s.gradeRow != null,
          gradeRow: s.gradeRow,
        })),
        pendingGradingCount: isStudent
          ? subs.filter((s) => s.gradeRow == null).length
          : (pendingByAssignment.get(a.id) ?? 0),
      };
    }),
  );
}));

export default router;
