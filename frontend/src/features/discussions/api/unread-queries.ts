import { useQuery } from '@/lib/async-query';
import { discussionKeys } from './discussion-keys';
import { getUnreadCount, listNotifications } from './service';
import type { UnreadSocketPayload } from './types';

export const useUnreadCount = () =>
  useQuery({
    queryKey: discussionKeys.unreadCount(),
    queryFn: () => getUnreadCount(),
    refetchInterval: 60_000,
    staleTime: 30_000
  });

export const useNotifications = (filter: 'all' | 'unread' = 'all', limit = 80) =>
  useQuery({
    queryKey: discussionKeys.notifications(filter),
    queryFn: () => listNotifications({ limit, unreadOnly: filter === 'unread' }),
    staleTime: 30_000
  });

/** Subscribe to the per-group unread map maintained by the socket. */
export const useUnreadSummary = () =>
  useQuery<UnreadSocketPayload>({
    queryKey: discussionKeys.unreadSummary(),
    queryFn: async () => ({ globalUnread: 0, byGroup: [], byGroupDm: [] }),
    staleTime: Infinity
  });
