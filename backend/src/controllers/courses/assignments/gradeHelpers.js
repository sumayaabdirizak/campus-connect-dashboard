import { prisma } from '../../../db/prisma.js';
import { pushToUser, pushToUsers } from '../../../services/pushNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';

const studentInclude = {
  student: { select: { id: true, full_name: true, email: true, number: true } },
};

export async function applyGroupGrade({ existing, assignmentId, submissionId, data, grade }) {
  const members = await prisma.groupMember.findMany({
    where: { groupId: existing.groupId },
    select: { memberId: true },
  });
  const memberIds = members.map((m) => m.memberId);

  await prisma.$transaction(async (tx) => {
    await tx.submission.updateMany({
      where: { assignmentId, groupId: existing.groupId },
      data,
    });
    const haveSubmissions = await tx.submission.findMany({
      where: { assignmentId, groupId: existing.groupId },
      select: { studentId: true },
    });
    const have = new Set(haveSubmissions.map((s) => s.studentId));
    const missing = memberIds.filter((id) => !have.has(id));
    if (missing.length > 0) {
      await tx.submission.createMany({
        data: missing.map((studentId) => ({
          assignmentId,
          studentId,
          groupId: existing.groupId,
          content_url: existing.content_url,
          ...data,
        })),
      });
    }
  });

  const updated = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: studentInclude,
  });

  if (grade !== undefined) {
    const a = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { title: true, courseOffering: { select: { publicId: true } } },
    });
    if (a) {
      pushToUsers(memberIds, {
        title: 'Group grade returned',
        body: `${a.title}: ${grade}%`,
        url: courseOfferingDashboardPath(a.courseOffering.publicId, 'assignments'),
        tag: `grade-${assignmentId}`,
      }).catch(() => {});
    }
  }
  return updated;
}

export async function applyIndividualGrade({ submissionId, data, grade, assignmentId }) {
  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data,
    include: studentInclude,
  });

  if (grade !== undefined) {
    const a = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { title: true, courseOffering: { select: { publicId: true } } },
    });
    if (a) {
      pushToUser(submission.studentId, {
        title: 'Grade returned',
        body: `${a.title}: ${grade}%`,
        url: courseOfferingDashboardPath(a.courseOffering.publicId, 'assignments'),
        tag: `grade-${assignmentId}`,
      }).catch(() => {});
    }
  }
  return submission;
}
