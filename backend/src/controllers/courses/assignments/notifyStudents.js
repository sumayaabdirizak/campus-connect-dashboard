import {
  notifyCourseOfferingStudents,
  notifyCourseOfferingTeacher,
} from '../../../services/courseActivityNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';

function assignmentBody(assignment) {
  const due = new Date(assignment.due_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${assignment.title}\nDue ${due}`;
}

/** Fire-and-forget student alerts for assignment publish / update. */
export function notifyAssignmentPublished(assignment, offeringPublicId) {
  void notifyCourseOfferingStudents({
    courseOfferingId: assignment.courseOfferingId,
    kind: 'ASSIGNMENT_PUBLISHED',
    title: 'New assignment',
    body: assignmentBody(assignment),
    href: courseOfferingDashboardPath(offeringPublicId, 'assignments'),
    tag: `assignment-new-${assignment.id}`,
    ctaLabel: 'Open assignment',
  }).catch(() => {});
}

export function notifyAssignmentUpdated(assignment, offeringPublicId) {
  void notifyCourseOfferingStudents({
    courseOfferingId: assignment.courseOfferingId,
    kind: 'ASSIGNMENT_UPDATED',
    title: 'Assignment updated',
    body: assignmentBody(assignment),
    href: courseOfferingDashboardPath(offeringPublicId, 'assignments'),
    tag: `assignment-updated-${assignment.id}`,
    ctaLabel: 'View assignment',
  }).catch(() => {});
}

/** Fire-and-forget student alert when their submission is graded. */
export function notifyAssignmentGraded(assignment, offeringPublicId, { studentId, grade, maxMarks }) {
  const scoreLabel =
    typeof grade === 'number' && typeof maxMarks === 'number' ? `${grade}/${maxMarks}` : 'ready';
  void notifyCourseOfferingStudents({
    courseOfferingId: assignment.courseOfferingId,
    kind: 'ASSIGNMENT_GRADED',
    title: 'Assignment graded',
    body: `${assignment.title} · ${scoreLabel}`,
    href: courseOfferingDashboardPath(offeringPublicId, 'assignments'),
    tag: `assignment-graded-${assignment.id}-${studentId}`,
    ctaLabel: 'View grade',
    userIds: [studentId],
  }).catch(() => {});
}

/** Fire-and-forget teacher alert when a student submits (or resubmits) work. */
export function notifyAssignmentSubmitted(assignment, offeringPublicId, { studentName } = {}) {
  void notifyCourseOfferingTeacher({
    courseOfferingId: assignment.courseOfferingId,
    kind: 'ASSIGNMENT_SUBMITTED',
    title: 'New submission',
    body: studentName
      ? `${studentName} submitted "${assignment.title}"`
      : `A student submitted "${assignment.title}"`,
    href: courseOfferingDashboardPath(offeringPublicId, 'assignments'),
    tag: `assignment-submitted-${assignment.id}`,
    ctaLabel: 'View submission',
  }).catch(() => {});
}
