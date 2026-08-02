import { prisma } from '../../../db/prisma.js';
import { pushToUser, pushToUsers } from '../../../services/pushNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';
import { upsertSubmissionGrade } from '../../../features/assignments/submissionGrade.js';
import { toSubmissionClient } from '../../../features/assignments/submissionDto.js';

const studentInclude = {
  student: { select: { id: true, full_name: true, email: true, number: true } },
  gradeRow: true,
};

export async function applyGroupGrade({
  existing,
  assignmentId,
  submissionId,
  data,
  grade,
  gradedById,
}) {
  const members = await prisma.groupMember.findMany({
    where: { groupId: existing.groupId },
    select: { memberId: true },
  });
  const memberIds = members.map((m) => m.memberId);
  const score = grade !== undefined ? grade : data.grade;
  const feedback = data.feedback;
  const isReviewed = data.is_reviewed ?? true;

  await prisma.$transaction(async (tx) => {
    const haveSubmissions = await tx.submission.findMany({
      where: { assignmentId, groupId: existing.groupId },
      select: { id: true, studentId: true },
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
        })),
      });
    }
    const allRows = await tx.submission.findMany({
      where: { assignmentId, groupId: existing.groupId },
      select: { id: true },
    });
    for (const row of allRows) {
      await upsertSubmissionGrade(
        row.id,
        { score, feedback, gradedById, isReviewed },
        tx,
      );
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
  return toSubmissionClient(updated);
}

export async function applyIndividualGrade({
  submissionId,
  data,
  grade,
  assignmentId,
  gradedById,
}) {
  const score = grade !== undefined ? grade : data.grade;
  const feedback = data.feedback;
  const isReviewed = data.is_reviewed ?? true;

  await upsertSubmissionGrade(submissionId, {
    score,
    feedback,
    gradedById,
    isReviewed,
  });

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: studentInclude,
  });

  if (grade !== undefined && submission) {
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
  return toSubmissionClient(submission);
}
