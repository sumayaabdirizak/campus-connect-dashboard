import { notifyCourseOfferingStudents } from '../../../services/courseActivityNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';

function feedBody(post) {
  const snippet = String(post.content || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  return snippet ? `${post.title}\n${snippet}` : String(post.title);
}

/** Fire-and-forget student alerts when a course feed post is created. */
export function notifyFeedPostCreated(post, offeringPublicId) {
  void notifyCourseOfferingStudents({
    courseOfferingId: post.courseOfferingId,
    kind: 'FEED_POST',
    title: 'New feed post',
    body: feedBody(post),
    href: courseOfferingDashboardPath(offeringPublicId, 'feed'),
    tag: `feed-post-${post.id}`,
    ctaLabel: 'Open feed',
  }).catch(() => {});
}
