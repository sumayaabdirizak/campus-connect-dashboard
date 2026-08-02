import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import { attachmentInclude } from './shared.js';
import {
  enrichAssignmentDto,
  publishedAssignmentWhere,
} from '../../../features/assignments/lifecycleService.js';

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

  res.json(
    assignments.map((a) => {
      const enriched = enrichAssignmentDto(a);
      const subs = a.submissions ?? [];
      return {
        ...enriched,
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
