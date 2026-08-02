/**
 * Pure assignment lifecycle helpers (no DB).
 * Schedule / publish / student-work status live here so all routes share one definition.
 */

export function getCloseAtMs(dueDate, lateWindowMinutes = 0) {
  return new Date(dueDate).getTime() + (Number(lateWindowMinutes) || 0) * 60_000;
}

/** Prefer extension newDueAt when it is later than assignment.due_date. */
export function pickEffectiveDue(assignmentDue, extensionNewDueAt) {
  const base = new Date(assignmentDue);
  if (!extensionNewDueAt) return base;
  const ext = new Date(extensionNewDueAt);
  return ext.getTime() > base.getTime() ? ext : base;
}

/**
 * @param {Date|string|null|undefined} openAt
 * @param {Date|string} effectiveDue
 * @param {number} lateWindowMinutes
 * @param {number} [nowMs]
 * @returns {'SCHEDULED'|'OPEN'|'CLOSED'}
 */
export function resolveScheduleStatus(openAt, effectiveDue, lateWindowMinutes = 0, nowMs = Date.now()) {
  if (openAt) {
    const openMs = new Date(openAt).getTime();
    if (Number.isFinite(openMs) && nowMs < openMs) return 'SCHEDULED';
  }
  const closeMs = getCloseAtMs(effectiveDue, lateWindowMinutes);
  if (nowMs > closeMs) return 'CLOSED';
  return 'OPEN';
}

/**
 * @param {{ submitted: boolean, isLate?: boolean, hasGrade?: boolean, isReviewed?: boolean }} opts
 * @param {Date|string} effectiveDue
 * @param {number} lateWindowMinutes
 * @param {number} [nowMs]
 * @returns {'NOT_SUBMITTED'|'SUBMITTED'|'LATE'|'MISSING'|'GRADED'}
 */
export function resolveStudentWorkStatus(opts, effectiveDue, lateWindowMinutes = 0, nowMs = Date.now()) {
  const { submitted, isLate, hasGrade, isReviewed } = opts;
  if (submitted && isReviewed && hasGrade) return 'GRADED';
  if (submitted && isLate) return 'LATE';
  if (submitted) return 'SUBMITTED';
  const closeMs = getCloseAtMs(effectiveDue, lateWindowMinutes);
  if (nowMs > closeMs) return 'MISSING';
  return 'NOT_SUBMITTED';
}

export function publishStatusFromDraft(isDraft) {
  return isDraft ? 'DRAFT' : 'PUBLISHED';
}

export function isDraftFromPublish(publishStatus) {
  return publishStatus === 'DRAFT';
}

export function lateStateFromBool(isLate) {
  return isLate ? 'LATE' : 'ON_TIME';
}
