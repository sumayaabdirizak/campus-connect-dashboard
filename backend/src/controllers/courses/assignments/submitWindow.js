import { prisma } from '../../../db/prisma.js';

/** Resolve group + leader check for GROUP-mode submits. */
export async function resolveSubmitGroup(assignment, selfId) {
  if (assignment.workMode !== 'GROUP') return { groupId: null };
  const membership = await prisma.groupMember.findFirst({
    where: {
      memberId: selfId,
      group: { courseOfferingId: assignment.courseOfferingId },
    },
    select: { groupId: true, role: true },
  });
  if (!membership) {
    return {
      error: {
        status: 400,
        message:
          'You must be in a group to submit a group assignment. Ask your teacher to assign you to a group.',
      },
    };
  }
  if (membership.role !== 'LEADER') {
    return {
      error: {
        status: 403,
        message: 'Only the group leader can submit for the group.',
      },
    };
  }
  return { groupId: membership.groupId };
}

export async function resolveEffectiveDue(assignment, selfId, groupId) {
  const ext = await prisma.submissionExtension.findUnique({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: selfId } },
  });
  let effectiveDue =
    ext?.newDueAt && ext.newDueAt > assignment.due_date ? ext.newDueAt : assignment.due_date;
  if (groupId != null) {
    const groupExt = await prisma.submissionExtension.findUnique({
      where: { assignmentId_groupId: { assignmentId: assignment.id, groupId } },
    });
    if (groupExt?.newDueAt && groupExt.newDueAt > effectiveDue) {
      effectiveDue = groupExt.newDueAt;
    }
  }
  return effectiveDue;
}
