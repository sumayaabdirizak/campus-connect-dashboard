import { prisma } from '../../db/prisma.js';

/**
 * Published assignments + quizzes share the course mark budget (Course.maxMarks,
 * default 100). Each item's maxMarks is its weight toward that total.
 */

export async function getCourseMaxMarks(courseOfferingId, tx = prisma) {
  const offering = await tx.courseOffering.findUnique({
    where: { id: courseOfferingId },
    select: { course: { select: { maxMarks: true } } },
  });
  return offering?.course?.maxMarks ?? 100;
}

export async function sumPublishedMarkWeights(
  courseOfferingId,
  { excludeAssignmentId, excludeQuizId } = {},
  tx = prisma
) {
  const assignmentWhere = {
    courseOfferingId,
    lifecycle: { publishStatus: 'PUBLISHED' },
    ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
  };
  const quizWhere = {
    courseOfferingId,
    is_draft: false,
    ...(excludeQuizId ? { id: { not: excludeQuizId } } : {}),
  };

  const [assignmentSum, quizSum] = await Promise.all([
    tx.assignment.aggregate({
      where: assignmentWhere,
      _sum: { maxMarks: true },
    }),
    tx.quiz.aggregate({
      where: quizWhere,
      _sum: { maxMarks: true },
    }),
  ]);

  return (assignmentSum._sum.maxMarks ?? 0) + (quizSum._sum.maxMarks ?? 0);
}

export async function getCourseMarkBudget(
  courseOfferingId,
  exclude = {},
  tx = prisma
) {
  const courseMax = await getCourseMaxMarks(courseOfferingId, tx);
  const allocated = await sumPublishedMarkWeights(courseOfferingId, exclude, tx);
  return {
    courseMax,
    allocated,
    remaining: Math.max(0, courseMax - allocated),
  };
}

export function budgetErrorMessage(budget, requestedMarks) {
  return `Course has ${budget.courseMax} marks total. ${budget.allocated} already allocated to published assignments and quizzes; ${budget.remaining} remaining. Cannot assign ${requestedMarks} marks.`;
}

export async function assertCourseMarkBudget(
  courseOfferingId,
  requestedMarks,
  exclude = {},
  tx = prisma
) {
  if (!Number.isInteger(requestedMarks) || requestedMarks < 1) {
    return { error: 'Mark weight must be a positive integer' };
  }
  const budget = await getCourseMarkBudget(courseOfferingId, exclude, tx);
  if (budget.allocated + requestedMarks > budget.courseMax) {
    return { error: budgetErrorMessage(budget, requestedMarks) };
  }
  return { data: budget };
}

/** Resolve quiz course weight on publish. */
export function resolveQuizCourseMarks({
  maxMarks,
  marksPlan,
  questionPointsSum = 0,
}) {
  if (Number.isInteger(maxMarks) && maxMarks > 0) return maxMarks;
  const planTotal = marksPlan?.totalMarks;
  if (Number.isInteger(planTotal) && planTotal > 0) return planTotal;
  if (questionPointsSum > 0) return Math.min(100, Math.round(questionPointsSum));
  return 0;
}
