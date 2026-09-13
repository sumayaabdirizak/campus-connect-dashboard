import { useQuery } from '@/lib/async-query';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import type { UnreadSocketPayload } from '@/lib/discussions/queries/types';

// Re-export generic notification hooks from lib/notifications for backward compatibility
export {
  useUnreadCount,
  useNotifications,
  useMarkNotificationsRead,
} from '@/lib/notifications/queries';

/** Subscribe to the per-group unread map maintained by the socket (discussion-specific). */
export const useUnreadSummary = () =>
  useQuery<UnreadSocketPayload>({
    queryKey: discussionKeys.unreadSummary(),
    queryFn: async () => ({ globalUnread: 0, byGroup: [], byGroupDm: [] }),
    staleTime: Infinity
  });
