import { notifyCourseOfferingStudents } from '../../../services/courseActivityNotifier.service.js';
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
