import { apiClient } from '@/lib/api-client';
import type {
  MarkReadPayload,
  NotificationsListResponse,
  UnreadCountResponse,
  UnreadSocketPayload,
} from './types';

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
