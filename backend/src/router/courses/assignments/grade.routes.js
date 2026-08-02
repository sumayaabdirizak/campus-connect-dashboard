import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireSubmissionGrade } from '../../../middleware/courseOfferingRbac.js';
import { applyGroupGrade, applyIndividualGrade } from '../../../controllers/courses/assignments/gradeHelpers.js';

const router = Router();

router.patch(
  '/:assignmentId/submissions/:submissionId',
  requireSubmissionGrade(),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const submissionId = parseInt(req.params.submissionId, 10);
    const { grade, feedback, is_reviewed } = req.body;
    const gradedById = Number(req.user?.id ?? req.user?.sub) || null;

    const existing = await prisma.submission.findFirst({
      where: { id: submissionId, assignmentId },
      include: { assignment: { select: { id: true, gradingScope: true, maxMarks: true } } },
    });
    if (!existing) return res.status(404).json({ message: 'Submission not found' });

    const cap = existing.assignment?.maxMarks ?? 100;
    if (grade !== undefined && grade !== null) {
      const g = Number(grade);
      if (Number.isNaN(g) || g < 0 || g > cap) {
        return res.status(400).json({ message: `Grade must be a number between 0 and ${cap}` });
      }
    }

    const data = {
      ...(grade !== undefined && { grade }),
      ...(feedback !== undefined && { feedback }),
      ...(is_reviewed !== undefined && { is_reviewed }),
    };

    if (existing.assignment?.gradingScope === 'GROUP' && existing.groupId != null) {
      const updated = await applyGroupGrade({
        existing,
        assignmentId,
        submissionId,
        data,
        grade,
        gradedById,
      });
      return res.json(updated);
    }

    const submission = await applyIndividualGrade({
      submissionId,
      data,
      grade,
      assignmentId,
      gradedById,
    });
    res.json(submission);
  }),
);

export default router;
