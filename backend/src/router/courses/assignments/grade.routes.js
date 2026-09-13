import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  requireAssignmentManage,
  requireSubmissionGrade,
} from '../../../middleware/courseOfferingRbac.js';
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

/**
 * Teacher enters / updates a mark from the gradebook without a student file.
 * Creates a placeholder submission when none exists, then upserts the grade.
 */
router.post(
  '/:assignmentId/manual-grade',
  requireAssignmentManage(),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const studentId = Number(req.body?.studentId);
    const grade = req.body?.grade;
    const feedback = req.body?.feedback;
    const gradedById = Number(req.user?.id ?? req.user?.sub) || null;

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ message: 'studentId is required' });
    }
    if (grade === undefined || grade === null || grade === '') {
      return res.status(400).json({ message: 'grade is required' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        maxMarks: true,
        gradingScope: true,
        workMode: true,
        courseOfferingId: true,
        courseOffering: { select: { sectionId: true } },
      },
    });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const cap = assignment.maxMarks ?? 100;
    const g = Number(grade);
    if (Number.isNaN(g) || g < 0 || g > cap) {
      return res.status(400).json({ message: `Grade must be a number between 0 and ${cap}` });
    }

    const enrolled = await prisma.studentRegistration.findFirst({
      where: { studentId, batchSectionId: assignment.courseOffering.sectionId },
      select: { id: true },
    });
    if (!enrolled) {
      return res.status(400).json({ message: 'That student is not enrolled in this course.' });
    }

    let groupId = null;
    if (assignment.workMode === 'GROUP') {
      const mem = await prisma.groupMember.findFirst({
        where: {
          memberId: studentId,
          group: { courseOfferingId: assignment.courseOfferingId },
        },
        select: { groupId: true },
      });
      groupId = mem?.groupId ?? null;
    }

    let existing = await prisma.submission.findFirst({
      where: { assignmentId, studentId },
      include: { assignment: { select: { id: true, gradingScope: true, maxMarks: true } } },
    });

    if (!existing) {
      existing = await prisma.submission.create({
        data: {
          assignmentId,
          studentId,
          content_url: '(Teacher-entered grade)',
          ...(groupId != null ? { groupId } : {}),
        },
        include: { assignment: { select: { id: true, gradingScope: true, maxMarks: true } } },
      });
    }

    const data = {
      grade: g,
      ...(feedback !== undefined ? { feedback } : {}),
      is_reviewed: true,
    };

    if (existing.assignment?.gradingScope === 'GROUP' && existing.groupId == null && groupId != null) {
      existing = { ...existing, groupId };
    }

    if (existing.assignment?.gradingScope === 'GROUP' && existing.groupId != null) {
      const updated = await applyGroupGrade({
        existing,
        assignmentId,
        submissionId: existing.id,
        data,
        grade: g,
        gradedById,
      });
      return res.json(updated);
    }

    const submission = await applyIndividualGrade({
      submissionId: existing.id,
      data,
      grade: g,
      assignmentId,
      gradedById,
    });
    res.json(submission);
  }),
);

export default router;
