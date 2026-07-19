import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireStudentSubmission } from '../../../middleware/courseOfferingRbac.js';
import { resolveSubmitGroup, resolveEffectiveDue } from './submitWindow.js';
import { upsertOwnSubmission, fanOutGroupSubmissions } from './submitPersist.js';

const router = Router();

router.post('/:assignmentId/submissions', requireStudentSubmission(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { studentId, link, content } = req.body;
  const selfId = req.user.sub;
  const targetStudentId = studentId != null ? Number(studentId) : selfId;
  if (targetStudentId !== selfId) {
    return res.status(403).json({ message: 'You may only submit as yourself' });
  }

  const content_url = link || content || '';
  if (!content_url) {
    return res.status(400).json({ message: 'link or content (content_url) is required' });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, open_at: true, due_date: true, lateWindowMinutes: true, workMode: true, courseOfferingId: true },
  });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

  const group = await resolveSubmitGroup(assignment, selfId);
  if (group.error) return res.status(group.error.status).json({ message: group.error.message });
  const resolvedGroupId = group.groupId;

  const now = new Date();
  if (assignment.open_at && now < assignment.open_at) {
    return res.status(403).json({ message: `Submissions open at ${assignment.open_at.toISOString()}` });
  }

  const effectiveDue = await resolveEffectiveDue(assignment, selfId, resolvedGroupId);
  const closeWithGrace = new Date(effectiveDue.getTime() + assignment.lateWindowMinutes * 60_000);
  if (now > closeWithGrace) return res.status(403).json({ message: 'Submissions closed' });
  const isLate = now > effectiveDue;

  const submission = await upsertOwnSubmission({
    assignmentId,
    studentId: targetStudentId,
    content_url,
    isLate,
    groupId: resolvedGroupId,
  });

  if (resolvedGroupId != null) {
    await fanOutGroupSubmissions({
      assignmentId,
      leaderId: targetStudentId,
      groupId: resolvedGroupId,
      content_url,
      isLate,
      now,
    });
  }

  res.json(submission);
}));

export default router;
