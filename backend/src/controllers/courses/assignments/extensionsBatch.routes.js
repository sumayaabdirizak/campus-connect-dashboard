import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';
import { pushToUsers } from '../../../services/pushNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';

const router = Router();

router.post('/:assignmentId/extensions/batch', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { studentIds = [], groupIds = [], newDueAt, reason } = req.body ?? {};
  if (!newDueAt) return res.status(400).json({ message: 'newDueAt is required' });
  if ((!Array.isArray(studentIds) || studentIds.length === 0) &&
      (!Array.isArray(groupIds) || groupIds.length === 0)) {
    return res.status(400).json({ message: 'Provide studentIds[] or groupIds[]' });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { courseOffering: { select: { publicId: true } } },
  });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  if (assignment.gradingScope === 'GROUP' && studentIds.length > 0) {
    return res.status(400).json({ message: 'Group-graded assignment: pass groupIds, not studentIds' });
  }
  if (assignment.gradingScope === 'INDIVIDUAL' && groupIds.length > 0) {
    return res.status(400).json({ message: 'Individually-graded assignment: pass studentIds, not groupIds' });
  }

  const newDate = new Date(newDueAt);
  const grantedById = req.user.id ?? req.user.sub;

  const results = await prisma.$transaction([
    ...studentIds.map((sid) =>
      prisma.submissionExtension.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId: Number(sid) } },
        create: { assignmentId, studentId: Number(sid), newDueAt: newDate, reason: reason ?? null, grantedById },
        update: { newDueAt: newDate, reason: reason ?? null },
      })
    ),
    ...groupIds.map((gid) =>
      prisma.submissionExtension.upsert({
        where: { assignmentId_groupId: { assignmentId, groupId: Number(gid) } },
        create: { assignmentId, groupId: Number(gid), newDueAt: newDate, reason: reason ?? null, grantedById },
        update: { newDueAt: newDate, reason: reason ?? null },
      })
    ),
  ]);

  // Resolve every affected student (group → members) and push.
  (async () => {
    const direct = studentIds.map((n) => Number(n));
    const groupMembers = groupIds.length
      ? (
          await prisma.groupMember.findMany({
            where: { groupId: { in: groupIds.map((n) => Number(n)) } },
            select: { memberId: true },
          })
        ).map((m) => m.memberId)
      : [];
    const affected = [...direct, ...groupMembers];
    if (affected.length === 0) return;
    pushToUsers(affected, {
      title: 'Another chance granted',
      body: `${assignment.title} · new due ${newDate.toLocaleString()}`,
      url: courseOfferingDashboardPath(assignment.courseOffering.publicId, 'assignments'),
      tag: `extension-${assignmentId}`,
    }).catch(() => {});
  })();

  res.status(201).json({ count: results.length, extensions: results });
}));

export default router;
