import { notifyCourseOfferingStudents } from '../../../services/courseActivityNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';

function resourceBody(resource) {
  const kind = String(resource.type || '').replace(/_/g, ' ').toLowerCase();
  return kind ? `${resource.title} (${kind})` : resource.title;
}

/** Fire-and-forget student alerts when a new course resource is published. */
export function notifyResourcePublished(resource, offeringPublicId) {
  void notifyCourseOfferingStudents({
    courseOfferingId: resource.courseOfferingId,
    kind: 'RESOURCE_PUBLISHED',
    title: 'New course material',
    body: resourceBody(resource),
    href: courseOfferingDashboardPath(offeringPublicId, 'resources'),
    tag: `resource-new-${resource.id}`,
    ctaLabel: 'Open resources',
  }).catch(() => {});
}
