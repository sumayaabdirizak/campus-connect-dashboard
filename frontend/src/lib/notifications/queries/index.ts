import { useQuery, useMutation, useQueryClient } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import type {
  MarkReadPayload,
  NotificationsListResponse,
  UnreadCountResponse,
  UnreadSocketPayload,
} from '../types';

// Query key factory for notifications
export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  list: (filter: 'all' | 'unread' = 'all') =>
    [...notificationKeys.all, 'list', filter] as const,
  courseActivity: () => [...notificationKeys.all, 'course-activity'] as const,
};

// API functions
export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const data = await apiClient<UnreadSocketPayload>('/discussions/me/notifications/unread-count');
  return { unreadCount: Number(data.globalUnread ?? 0) };
};

export const listNotifications = (params: { limit?: number; unreadOnly?: boolean } = {}) => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.unreadOnly) qs.set('unreadOnly', 'true');
  const query = qs.toString();
  return apiClient<NotificationsListResponse>(
    `/discussions/me/notifications${query ? `?${query}` : ''}`
  );
};

export const markNotificationsRead = (body: MarkReadPayload) =>
  apiClient<{ updatedCount: number }>('/discussions/me/notifications/read', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

// Query hooks
export const useUnreadCount = () =>
  useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => getUnreadCount(),
    refetchInterval: 60_000,
    staleTime: 30_000
  });

export const useNotifications = (filter: 'all' | 'unread' = 'all', limit = 80) =>
  useQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: () => listNotifications({ limit, unreadOnly: filter === 'unread' }),
    staleTime: 30_000
  });

// Mutation hooks
export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkReadPayload) => markNotificationsRead(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      qc.invalidateQueries({ queryKey: notificationKeys.list() });
      qc.invalidateQueries({ queryKey: ['inbox'] });
    }
  });
};
