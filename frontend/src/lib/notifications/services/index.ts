/* Notification Services Index */

// Re-export notification types
export type { NotifItem, NotifSource } from '../types';

// Re-export notification feed aggregation and mapping logic
export { rel, discTitle, discHref, discSubtitle, groupNotifications } from './utils/notification-feed-mappers';
export { markKeysRead, useReadKeys } from './utils/read-store';
export { useNotificationFeed } from './utils/use-notification-feed';

// Re-export push notification and web push utilities
export { usePushSubscription } from './use-push-subscription';
export { subscribeUserToPush, unsubscribeUserFromPush } from './web-push';

// Re-export course activity mapping
export { mapCourseActivityItems } from './utils/map-course-activity';
