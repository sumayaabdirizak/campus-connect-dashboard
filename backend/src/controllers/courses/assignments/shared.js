import {
  assertCourseMarkBudget,
  reserveCourseMarkWeight,
} from '../../../services/courses/courseMarkBudget.service.js';

/** Default course mark weight when the client omits maxMarks (share of 100). */
export const DEFAULT_ASSIGNMENT_MARK_WEIGHT = 10;

export const attachmentInclude = {
  attachments: {
    orderBy: { created_at: 'asc' },
    include: { uploadedBy: { select: { id: true, full_name: true } } },
  },
};

export function normaliseModes({ workMode, gradingScope }) {
  const valid = (v) => v === 'INDIVIDUAL' || v === 'GROUP';
  const wm = valid(workMode) ? workMode : null;
  const gs = valid(gradingScope) ? gradingScope : null;
  if (wm === 'INDIVIDUAL' && gs === 'GROUP') {
    return { error: 'workMode=INDIVIDUAL is incompatible with gradingScope=GROUP' };
  }
  return { data: { ...(wm && { workMode: wm }), ...(gs && { gradingScope: gs }) } };
}

export function normaliseMaxMarks(maxMarks) {
  if (maxMarks === undefined || maxMarks === null) return { data: {} };
  if (!Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
    return { error: 'maxMarks must be an integer between 1 and 100 (course mark weight)' };
  }
  return { data: { maxMarks } };
}

export async function validateAssignmentMarkBudget(
  courseOfferingId,
  requestedMarks,
  excludeAssignmentId,
  tx
) {
  const budget = await assertCourseMarkBudget(
    courseOfferingId,
    requestedMarks,
    { excludeAssignmentId },
    tx
  );
  if (budget.error) return { error: budget.error };
  return { data: budget.data };
}

/** Resolve assignment maxMarks against remaining budget (draft + publish). */
export async function resolveAssignmentMaxMarks(
  courseOfferingId,
  requestedMarks,
  excludeAssignmentId,
  tx
) {
  const requested = Number.isInteger(requestedMarks) ? requestedMarks : DEFAULT_ASSIGNMENT_MARK_WEIGHT;
  const reserved = await reserveCourseMarkWeight(
    courseOfferingId,
    requested,
    { excludeAssignmentId },
    tx
  );
  if (reserved.error) return { error: reserved.error };
  return { data: reserved.data };
}

/** Coerce late window to int minutes; omit when undefined/null. */
export function normaliseLateWindow(lateWindowMinutes) {
  if (lateWindowMinutes === undefined || lateWindowMinutes === null) {
    return { data: {} };
  }
  const n = Number(lateWindowMinutes);
  if (!Number.isFinite(n)) {
    return { error: 'lateWindowMinutes must be a number' };
  }
  const minutes = Math.trunc(n);
  if (minutes < 0 || minutes > 10080) {
    return { error: 'lateWindowMinutes must be between 0 and 10080' };
  }
  return { data: { lateWindowMinutes: minutes } };
}
