import type { CourseMarkBudget } from './mark-budget-service';
import type { Quiz } from './quizzes-types';

export const MARK_BUDGET_FULL_MESSAGE =
  'Course mark budget is fully allocated. Unpublish or reduce marks on existing assignments and quizzes before adding more.';

/** Room for this item after excluding its current published weight (when editing). */
export function effectiveMarkBudgetRemaining(
  budget: CourseMarkBudget,
  excludePublishedMarks = 0
): number {
  return Math.max(0, budget.remaining + excludePublishedMarks);
}

export function isMarkBudgetExhausted(
  budget: CourseMarkBudget,
  excludePublishedMarks = 0
): boolean {
  return effectiveMarkBudgetRemaining(budget, excludePublishedMarks) <= 0;
}

/** Clamp requested marks to available course budget (minimum 1 when room exists). */
export function clampToMarkBudget(
  budget: CourseMarkBudget,
  requestedMarks: number,
  excludePublishedMarks = 0
): number {
  const available = effectiveMarkBudgetRemaining(budget, excludePublishedMarks);
  if (available <= 0) return 0;
  const requested = Number.isFinite(requestedMarks) ? Math.trunc(requestedMarks) : 1;
  return Math.min(available, Math.max(1, requested));
}

export function wouldExceedMarkBudget(
  budget: CourseMarkBudget,
  requestedMarks: number,
  excludePublishedMarks = 0
): boolean {
  if (!Number.isFinite(requestedMarks) || requestedMarks < 1) return false;
  return requestedMarks > effectiveMarkBudgetRemaining(budget, excludePublishedMarks);
}

export function markBudgetExceededMessage(
  budget: CourseMarkBudget,
  requestedMarks: number,
  excludePublishedMarks = 0
): string {
  const available = effectiveMarkBudgetRemaining(budget, excludePublishedMarks);
  return `Course has ${budget.courseMax} marks total. ${budget.allocated} already allocated; ${available} available. Cannot assign ${requestedMarks} marks.`;
}

export function quizQuestionPointsSum(quiz: Quiz): number {
  return (quiz.questions ?? []).reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}

/** Course mark weight a quiz would use on publish (mirrors backend resolve). */
export function resolveQuizRequestedCourseMarks(quiz: Quiz): number {
  const courseMarks = quiz.maxMarks ?? 0;
  if (courseMarks > 0) return courseMarks;
  const planMarks = quiz.marksPlan?.totalMarks ?? 0;
  if (planMarks > 0) return planMarks;
  const questionPts = quizQuestionPointsSum(quiz);
  if (questionPts > 0) return Math.min(100, Math.round(questionPts));
  return 0;
}
