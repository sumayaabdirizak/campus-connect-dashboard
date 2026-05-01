import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireAssignmentManage,
  requireAssignmentSubmissionsRead,
  requireStudentSubmission,
  requireSubmissionGrade,
} from "../../middleware/courseOfferingRbac.js";

const router = Router();

router.get('/:courseOfferingId', auth, requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;

  const assignments = await prisma.assignment.findMany({
    where: { courseOfferingId: parseInt(courseOfferingId, 10) },
    include: {
      submissions: { select: { id: true, studentId: true, grade: true, is_reviewed: true } },
      _count: { select: { submissions: true } }
    },
    orderBy: { due_date: 'asc' },
  });

  res.json(assignments);
}));

router.post('/:courseOfferingId', auth, requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { title, description, due_date, is_draft } = req.body;

  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      due_date: due_date ? new Date(due_date) : new Date(),
      is_draft: Boolean(is_draft),
      courseOfferingId: parseInt(courseOfferingId, 10),
    },
    include: {
      submissions: true,
      _count: { select: { submissions: true } }
    },
  });

  res.json(assignment);
}));

router.patch('/:assignmentId', auth, requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { title, description, due_date, is_draft } = req.body;

  const assignment = await prisma.assignment.update({
    where: { id: parseInt(assignmentId, 10) },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(due_date && { due_date: new Date(due_date) }),
      ...(is_draft !== undefined && { is_draft: Boolean(is_draft) }),
    },
    include: {
      submissions: true,
      _count: { select: { submissions: true } }
    },
  });

  res.json(assignment);
}));

router.delete('/:assignmentId', auth, requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  await prisma.submission.deleteMany({ where: { assignmentId: parseInt(assignmentId, 10) } });
  await prisma.assignment.delete({ where: { id: parseInt(assignmentId, 10) } });

  res.json({ success: true });
}));

router.get('/:assignmentId/submissions', auth, requireAssignmentSubmissionsRead(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: parseInt(assignmentId, 10) },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } }
    },
    orderBy: { submitted_at: 'desc' },
  });

  res.json(submissions);
}));

router.post('/:assignmentId/submissions', auth, requireStudentSubmission(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { studentId, link, content } = req.body;
  const selfId = req.user.sub;
  const targetStudentId = studentId != null ? Number(studentId) : selfId;
  if (targetStudentId !== selfId) {
    return res.status(403).json({ message: "You may only submit as yourself" });
  }

  const content_url = link || content || "";
  if (!content_url) {
    return res.status(400).json({ message: "link or content (content_url) is required" });
  }

  const submission = await prisma.submission.create({
    data: {
      assignmentId: parseInt(assignmentId, 10),
      studentId: targetStudentId,
      content_url,
    },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } }
    },
  });

  res.json(submission);
}));

router.patch('/:assignmentId/submissions/:submissionId', auth, requireSubmissionGrade(), asyncHandler(async (req, res) => {
  const { assignmentId, submissionId } = req.params;
  const { grade, feedback, is_reviewed } = req.body;

  const existing = await prisma.submission.findFirst({
    where: {
      id: parseInt(submissionId, 10),
      assignmentId: parseInt(assignmentId, 10),
    },
  });
  if (!existing) {
    return res.status(404).json({ message: "Submission not found" });
  }

  const submission = await prisma.submission.update({
    where: { id: parseInt(submissionId, 10) },
    data: {
      ...(grade !== undefined && { grade }),
      ...(feedback !== undefined && { feedback }),
      ...(is_reviewed !== undefined && { is_reviewed }),
    },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } }
    },
  });

  res.json(submission);
}));

export default router;
