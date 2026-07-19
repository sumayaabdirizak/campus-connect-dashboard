import { prisma } from '../../../db/prisma.js';

const studentInclude = {
  student: { select: { id: true, full_name: true, email: true, number: true } },
};

export async function upsertOwnSubmission({
  assignmentId,
  studentId,
  content_url,
  isLate,
  groupId,
}) {
  const existing = await prisma.submission.findFirst({
    where: { assignmentId, studentId },
    select: { id: true },
  });
  const data = {
    content_url,
    is_late: isLate,
    submitted_at: new Date(),
    grade: null,
    feedback: null,
    is_reviewed: false,
    ...(groupId != null && { groupId }),
  };
  if (existing) {
    return prisma.submission.update({
      where: { id: existing.id },
      data,
      include: studentInclude,
    });
  }
  return prisma.submission.create({
    data: {
      assignmentId,
      studentId,
      content_url,
      is_late: isLate,
      ...(groupId != null && { groupId }),
    },
    include: studentInclude,
  });
}

/** Fan-out leader submit to other group members. */
export async function fanOutGroupSubmissions({
  assignmentId,
  leaderId,
  groupId,
  content_url,
  isLate,
  now,
}) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { memberId: true },
  });
  const otherIds = members.map((m) => m.memberId).filter((id) => id !== leaderId);
  await Promise.all(
    otherIds.map(async (memberId) => {
      const memberSub = await prisma.submission.findFirst({
        where: { assignmentId, studentId: memberId },
        select: { id: true },
      });
      if (memberSub) {
        await prisma.submission.update({
          where: { id: memberSub.id },
          data: {
            content_url,
            is_late: isLate,
            submitted_at: now,
            groupId,
            grade: null,
            feedback: null,
            is_reviewed: false,
          },
        });
      } else {
        await prisma.submission.create({
          data: { assignmentId, studentId: memberId, content_url, is_late: isLate, groupId },
        });
      }
    }),
  );
}
