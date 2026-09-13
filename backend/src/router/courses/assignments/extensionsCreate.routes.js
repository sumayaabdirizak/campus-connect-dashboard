import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';
import { pushToUsers } from '../../../services/pushNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';

const router = Router();

router.post('/:assignmentId/extensions', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { studentId, groupId, newDueAt, reason } = req.body ?? {};
  if (!newDueAt) return res.status(400).json({ message: 'newDueAt is required' });
  if (!studentId === !groupId) {
    return res.status(400).json({ message: 'Exactly one of studentId or groupId is required' });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { courseOffering: { select: { publicId: true } } },
  });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  if (assignment.gradingScope === 'GROUP' && !groupId) {
    return res.status(400).json({ message: 'Group-graded assignment requires groupId' });
  }
  if (assignment.gradingScope === 'INDIVIDUAL' && !studentId) {
    return res.status(400).json({ message: 'Individually-graded assignment requires studentId' });
  }

  const where = studentId
    ? { assignmentId_studentId: { assignmentId, studentId: Number(studentId) } }
    : { assignmentId_groupId: { assignmentId, groupId: Number(groupId) } };

  const extension = await prisma.submissionExtension.upsert({
    where,
    create: {
      assignmentId,
      studentId: studentId ? Number(studentId) : null,
      groupId: groupId ? Number(groupId) : null,
      newDueAt: new Date(newDueAt),
      reason: reason ?? null,
      grantedById: req.user.id ?? req.user.sub,
    },
    update: { newDueAt: new Date(newDueAt), reason: reason ?? null },
  });

  // Push the affected student(s). For a group-targeted extension we look up
  // every member; for a student-targeted one it's just the one.
  (async () => {
    let userIds = [];
    if (studentId) userIds = [Number(studentId)];
    else if (groupId) {
      const members = await prisma.groupMember.findMany({
        where: { groupId: Number(groupId) },
        select: { memberId: true },
      });
      userIds = members.map((m) => m.memberId);
    }
    if (userIds.length === 0) return;
    pushToUsers(userIds, {
      title: 'Another chance granted',
      body: `${assignment.title} · new due ${new Date(newDueAt).toLocaleString()}`,
      url: courseOfferingDashboardPath(assignment.courseOffering.publicId, 'assignments'),
      tag: `extension-${assignmentId}`,
    }).catch(() => {});
  })();

  res.status(201).json(extension);
}));

export default router;
