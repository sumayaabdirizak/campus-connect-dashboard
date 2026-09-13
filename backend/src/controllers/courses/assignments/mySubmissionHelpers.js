import { prisma } from '../../../db/prisma.js';

export function pickEffectiveExtension(studentExt, groupExt) {
  if (!studentExt && !groupExt) return null;
  if (!studentExt) return groupExt;
  if (!groupExt) return studentExt;
  return new Date(studentExt.newDueAt) >= new Date(groupExt.newDueAt) ? studentExt : groupExt;
}

/** Batch-load effective extensions for a student's assignment cards (list view). */
export async function loadStudentExtensionsForAssignments(
  courseOfferingId,
  studentId,
  assignments,
) {
  if (assignments.length === 0) return new Map();

  const assignmentIds = new Set(assignments.map((a) => a.id));
  const [extensions, membership] = await Promise.all([
    prisma.submissionExtension.findMany({
      where: {
        assignmentId: { in: [...assignmentIds] },
        OR: [{ studentId }, { groupId: { not: null } }],
      },
      select: {
        assignmentId: true,
        studentId: true,
        groupId: true,
        newDueAt: true,
        reason: true,
      },
    }),
    prisma.groupMember.findFirst({
      where: { memberId: studentId, group: { courseOfferingId } },
      select: { groupId: true },
    }),
  ]);

  const result = new Map();
  for (const assignment of assignments) {
    const studentExt = extensions.find(
      (e) => e.assignmentId === assignment.id && e.studentId === studentId,
    );
    const groupExt =
      membership != null
        ? extensions.find(
            (e) => e.assignmentId === assignment.id && e.groupId === membership.groupId,
          )
        : null;
    const effectiveExt = pickEffectiveExtension(
      studentExt
        ? { newDueAt: studentExt.newDueAt, reason: studentExt.reason ?? null }
        : null,
      groupExt
        ? { newDueAt: groupExt.newDueAt, reason: groupExt.reason ?? null }
        : null,
    );
    if (
      effectiveExt &&
      new Date(effectiveExt.newDueAt).getTime() > new Date(assignment.due_date).getTime()
    ) {
      result.set(assignment.id, effectiveExt);
    }
  }
  return result;
}

export async function loadMySubmissionContext(assignmentId, studentId) {
  const [submission, studentExt, assignment] = await Promise.all([
    prisma.submission.findFirst({
      where: { assignmentId, studentId },
      include: {
        student: { select: { id: true, full_name: true, email: true, number: true } },
        gradeRow: true,
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

  const effectiveExt = pickEffectiveExtension(studentExt, groupExt);

  return { submission, effectiveExt, groupInfo };
}
