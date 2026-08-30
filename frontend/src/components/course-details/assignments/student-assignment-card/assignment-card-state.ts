import { format } from 'date-fns';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import { serverNowDate } from '@/lib/server-clock';
import { dueSoonLabel } from './helpers';

export type AssignmentStatusKey =
  | 'opens_soon'
  | 'not_submitted'
  | 'due_soon'
  | 'submitted'
  | 'late'
  | 'graded_pass'
  | 'graded_fail'
  | 'missed';

export type StatusTone = 'neutral' | 'sky' | 'amber' | 'emerald' | 'rose';

export type AssignmentDisplayStatus = {
  key: AssignmentStatusKey;
  label: string;
  tone: StatusTone;
};

export type AssignmentCardTiming = {
  openAt: Date | null;
  baseDue: Date;
  due: Date;
  hasExtension: boolean;
  notOpenYet: boolean;
  closed: boolean;
  dueSoon: boolean;
  dueSoonText: string | null;
  msUntilDue: number;
  hasSubmitted: boolean;
  isGraded: boolean;
  passed: boolean;
  canSubmit: boolean;
  isGroupAssignment: boolean;
  isLeader: boolean;
};

export function resolveAssignmentCardTiming(
  a: Assignment,
  mySubmission: Submission | null,
  groupInfo: { isLeader?: boolean } | null | undefined,
  extension?: Submission['_extension']
): AssignmentCardTiming {
  const now = serverNowDate();
  const openAt = a.open_at ? new Date(a.open_at) : null;
  const baseDue = new Date(a.due_date);
  const effectiveExtension = extension ?? mySubmission?._extension ?? null;
  const extensionDue = effectiveExtension?.newDueAt
    ? new Date(effectiveExtension.newDueAt)
    : null;
  const due =
    extensionDue && extensionDue.getTime() > baseDue.getTime() ? extensionDue : baseDue;
  const hasExtension = extensionDue != null && extensionDue.getTime() > baseDue.getTime();
  const notOpenYet = openAt != null && now < openAt;
  const closed = now > new Date(due.getTime() + (a.lateWindowMinutes ?? 0) * 60_000);
  const msUntilDue = due.getTime() - now.getTime();
  const dueSoon = !closed && msUntilDue > 0 && msUntilDue < 48 * 60 * 60 * 1000;
  const dueSoonText = dueSoonLabel(msUntilDue);

  const listSub = a.submissions?.[0];
  const hasSubmitted = mySubmission != null || listSub != null;
  const grade = mySubmission?.grade ?? listSub?.grade ?? null;
  const isReviewed =
    mySubmission?.is_reviewed ?? listSub?.is_reviewed ?? false;
  const isGraded = isReviewed && grade != null;
  const maxMarks = a.maxMarks ?? 100;
  const passed = isGraded && (grade ?? 0) >= maxMarks * 0.5;
  const isGroupAssignment = a.workMode === 'GROUP';
  const isLeader = groupInfo?.isLeader === true;

  return {
    openAt,
    baseDue,
    due,
    hasExtension,
    notOpenYet,
    closed,
    dueSoon,
    dueSoonText,
    msUntilDue,
    hasSubmitted,
    isGraded,
    passed,
    canSubmit:
      !notOpenYet &&
      !closed &&
      !hasSubmitted &&
      !isGraded &&
      (!isGroupAssignment || isLeader),
    isGroupAssignment,
    isLeader,
  };
}

export function getAssignmentDisplayStatus(
  timing: AssignmentCardTiming,
  opts: { grade: number | null; isLate?: boolean; maxMarks: number }
): AssignmentDisplayStatus {
  const { grade, isLate, maxMarks } = opts;

  if (timing.isGraded && grade != null) {
    const marksLabel = `${grade}/${maxMarks}`;
    return timing.passed
      ? { key: 'graded_pass', label: `Marked · ${marksLabel}`, tone: 'emerald' }
      : { key: 'graded_fail', label: `Marked · ${marksLabel}`, tone: 'rose' };
  }
  if (timing.hasSubmitted && isLate) {
    return { key: 'late', label: 'Late', tone: 'amber' };
  }
  if (timing.hasSubmitted) {
    return { key: 'submitted', label: 'Submitted', tone: 'emerald' };
  }
  if (timing.notOpenYet) {
    return { key: 'opens_soon', label: 'Opens soon', tone: 'neutral' };
  }
  if (timing.closed) {
    return { key: 'missed', label: 'Missed', tone: 'rose' };
  }
  if (timing.dueSoon && timing.dueSoonText) {
    return { key: 'due_soon', label: `Due ${timing.dueSoonText}`, tone: 'amber' };
  }
  return { key: 'not_submitted', label: 'Pending', tone: 'sky' };
}

export function formatAssignmentDueLine(timing: AssignmentCardTiming): string {
  if (timing.dueSoon && timing.dueSoonText) {
    return `Due ${timing.dueSoonText}`;
  }
  return `Due ${format(timing.due, 'MMM d, yyyy · h:mm a')}`;
}

/** Auto-expand when the student should act or the deadline is near. */
export function shouldAutoExpandAssignment(
  status: AssignmentDisplayStatus,
  timing: AssignmentCardTiming
): boolean {
  if (status.key === 'due_soon') return true;
  if (status.key === 'not_submitted' && timing.canSubmit) return true;
  return false;
}
