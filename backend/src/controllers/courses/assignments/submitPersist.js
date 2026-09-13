import { prisma } from '../../../db/prisma.js';
import {
  clearSubmissionGrade,
  submissionLateFields,
} from '../../../services/assignments/submissionGrade.js';
import { toSubmissionClient } from '../../../services/assignments/submissionDto.js';

const studentInclude = {
  student: { select: { id: true, full_name: true, email: true, number: true } },
  gradeRow: true,
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
  const lateFields = submissionLateFields(isLate);
  const data = {
    content_url,
    ...lateFields,
    submitted_at: new Date(),
    ...(groupId != null && { groupId }),
  };
  let row;
  if (existing) {
    row = await prisma.submission.update({
      where: { id: existing.id },
      data,
      include: studentInclude,
    });
    await clearSubmissionGrade(existing.id);
  } else {
    row = await prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        content_url,
        ...lateFields,
        ...(groupId != null && { groupId }),
      },
      include: studentInclude,
    });
  }
  return toSubmissionClient(row);
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
  const lateFields = submissionLateFields(isLate);
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
            ...lateFields,
            submitted_at: now,
            groupId,
          },
        });
        await clearSubmissionGrade(memberSub.id);
      } else {
        await prisma.submission.create({
          data: {
            assignmentId,
            studentId: memberId,
            content_url,
            ...lateFields,
            groupId,
          },
        });
      }
    }),
  );
}
