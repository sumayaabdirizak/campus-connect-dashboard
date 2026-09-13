import { prisma } from '../../db/prisma.js';
import {
  getCloseAtMs,
  pickEffectiveDue,
  publishStatusFromDraft,
  resolveScheduleStatus,
} from './lifecycleCore.js';

export {
  getCloseAtMs,
  pickEffectiveDue,
  resolveScheduleStatus,
  resolveStudentWorkStatus,
  publishStatusFromDraft,
  isDraftFromPublish,
  lateStateFromBool,
} from './lifecycleCore.js';

export {
  upsertSubmissionGrade,
  clearSubmissionGrade,
  submissionLateFields,
} from './submissionGrade.js';

export { ensureLifecycle, transitionPublish } from './lifecycleTransitions.js';

/** Load student/group extension and return effective due Date. */
export async function getEffectiveDue(assignment, { studentId, groupId } = {}) {
  let best = assignment.due_date;
  if (studentId != null) {
    const ext = await prisma.submissionExtension.findUnique({
      where: {
        assignmentId_studentId: { assignmentId: assignment.id, studentId },
      },
    });
    best = pickEffectiveDue(best, ext?.newDueAt);
  }
  if (groupId != null) {
    const groupExt = await prisma.submissionExtension.findUnique({
      where: {
        assignmentId_groupId: { assignmentId: assignment.id, groupId },
      },
    });
    best = pickEffectiveDue(best, groupExt?.newDueAt);
  }
  return best instanceof Date ? best : new Date(best);
}

export function getCloseAt(assignmentOrDue, lateWindowMinutes) {
  if (assignmentOrDue && typeof assignmentOrDue === 'object' && 'due_date' in assignmentOrDue) {
    return new Date(
      getCloseAtMs(assignmentOrDue.due_date, assignmentOrDue.lateWindowMinutes ?? 0),
    );
  }
  return new Date(getCloseAtMs(assignmentOrDue, lateWindowMinutes ?? 0));
}

/** Enrich assignment DTO with lifecycle + schedule (+ compat is_draft). */
export function enrichAssignmentDto(assignment, nowMs = Date.now()) {
  const publishStatus =
    assignment.lifecycle?.publishStatus ?? publishStatusFromDraft(false);
  const scheduleStatus =
    assignment.lifecycle?.scheduleStatus ??
    resolveScheduleStatus(
      assignment.open_at,
      assignment.due_date,
      assignment.lateWindowMinutes ?? 0,
      nowMs,
    );
  return {
    ...assignment,
    publishStatus,
    scheduleStatus,
    is_draft: publishStatus === 'DRAFT',
  };
}

export const publishedAssignmentWhere = {
  lifecycle: { publishStatus: 'PUBLISHED' },
};
