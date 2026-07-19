import { prisma } from '../../../db/prisma.js';

export async function loadMySubmissionContext(assignmentId, studentId) {
  const [submission, studentExt, assignment] = await Promise.all([
    prisma.submission.findFirst({
      where: { assignmentId, studentId },
      include: {
        student: { select: { id: true, full_name: true, email: true, number: true } },
      },
    }),
    prisma.submissionExtension.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      select: { newDueAt: true, reason: true },
    }),
    prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { courseOfferingId: true, workMode: true },
    }),
  ]);

  let groupExt = null;
  let groupInfo = null;
  if (assignment?.workMode === 'GROUP') {
    const membership = await prisma.groupMember.findFirst({
      where: { memberId: studentId, group: { courseOfferingId: assignment.courseOfferingId } },
      select: {
        groupId: true,
        role: true,
        group: {
          select: {
            id: true,
            name: true,
            members: {
              include: { member: { select: { id: true, full_name: true } } },
              orderBy: [{ role: 'asc' }, { joined_at: 'asc' }],
            },
          },
        },
      },
    });
    if (membership) {
      groupExt = await prisma.submissionExtension.findUnique({
        where: { assignmentId_groupId: { assignmentId, groupId: membership.groupId } },
        select: { newDueAt: true, reason: true },
      });
      groupInfo = {
        groupId: membership.group.id,
        groupName: membership.group.name,
        isLeader: membership.role === 'LEADER',
        members: membership.group.members.map((m) => ({
          id: m.memberId,
          name: m.member.full_name,
          role: m.role,
        })),
      };
    }
  }

  const effectiveExt = (() => {
    if (!studentExt && !groupExt) return null;
    if (!studentExt) return groupExt;
    if (!groupExt) return studentExt;
    return new Date(studentExt.newDueAt) >= new Date(groupExt.newDueAt) ? studentExt : groupExt;
  })();

  return { submission, effectiveExt, groupInfo };
}
