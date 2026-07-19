import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';

const router = Router();

router.get(
  '/course/:courseOfferingId/students/:studentId/work', requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const studentId = parseInt(req.params.studentId, 10);
    if (!Number.isInteger(studentId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const [assignments, submissions, quizAttempts] = await Promise.all([
      prisma.assignment.findMany({
        where: { courseOfferingId },
        select: { id: true, title: true, due_date: true, gradingScope: true },
        orderBy: { due_date: 'asc' },
      }),
      prisma.submission.findMany({
        where: {
          studentId,
          assignment: { courseOfferingId },
        },
        select: {
          id: true,
          assignmentId: true,
          grade: true,
          feedback: true,
          is_late: true,
          is_reviewed: true,
          submitted_at: true,
          content_url: true,
        },
        orderBy: { submitted_at: 'desc' },
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
          quiz: { select: { id: true, title: true, passing_score: true } },
        },
        orderBy: { submitted_at: 'desc' },
      }),
    ]);

    const submittedAssignmentIds = new Set(submissions.map((s) => s.assignmentId));
    const missingCount = assignments.filter((a) => !submittedAssignmentIds.has(a.id)).length;
    const lateCount = submissions.filter((s) => s.is_late).length;
    const graded = submissions.filter((s) => typeof s.grade === 'number');
    const avgGrade =
      graded.length > 0
        ? Math.round((graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length) * 10) /
          10
        : null;

    res.json({
      assignments,
      submissions,
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
  })
);

export default router;
