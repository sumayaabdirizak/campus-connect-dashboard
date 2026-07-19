import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';

const router = Router();

router.get(
  '/course/:courseOfferingId/my-summary', requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const studentId = req.user.id ?? req.user.sub;
    const now = new Date();

    const [assignments, submissions] = await Promise.all([
      prisma.assignment.findMany({
        where: { courseOfferingId, is_draft: false },
        select: { id: true, due_date: true },
      }),
      prisma.submission.findMany({
        where: {
          studentId,
          assignment: { courseOfferingId, is_draft: false },
        },
        select: {
          id: true,
          assignmentId: true,
          grade: true,
          is_late: true,
          is_reviewed: true,
        },
      }),
    ]);

    const submittedIds = new Set(submissions.map((s) => s.assignmentId));
    const totalPublished = assignments.length;
    const submittedCount = submissions.length;
    const gradedSubmissions = submissions.filter(
      (s) => s.is_reviewed && typeof s.grade === 'number'
    );
    const lateCount = submissions.filter((s) => s.is_late).length;
    // "Missing" = past due AND never submitted. We don't count not-yet-due
    // assignments as missing — the student still has time.
    const missingCount = assignments.filter(
      (a) => !submittedIds.has(a.id) && new Date(a.due_date) < now
    ).length;
    const avgGrade = gradedSubmissions.length
      ? Math.round(
          (gradedSubmissions.reduce((sum, s) => sum + (s.grade ?? 0), 0) /
            gradedSubmissions.length) * 10
        ) / 10
      : null;

    res.json({
      totalPublished,
      submittedCount,
      gradedCount: gradedSubmissions.length,
      lateCount,
      missingCount,
      avgGrade,
    });
  })
);

export default router;
