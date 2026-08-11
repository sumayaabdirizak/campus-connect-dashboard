import { apiClient } from '@/lib/api-client';
import type {
  ChannelMessagesResponse,
  DiscussionMessage,
  EditMessagePayload,
  MessageReaction,
  SendMessagePayload,
} from '@/lib/discussions/queries/types';

export type ListMessagesParams = {
  limit?: number;
  cursor?: string | null;
  threadRoot?: string | null;
};

export type SearchFilterParams = {
  from?: string;
  has?: 'image' | 'video' | 'file' | 'attachment';
  before?: string;
  after?: string;
};

function buildSearchQS(q: string, limit: number, filters?: SearchFilterParams): string {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (filters?.from) params.set('from', filters.from);
  if (filters?.has) params.set('has', filters.has);
  if (filters?.before) params.set('before', filters.before);
  if (filters?.after) params.set('after', filters.after);
  return params.toString();
}

type SearchResponse = {
  results: DiscussionMessage[];
  hasMore: boolean;
  q: string;
  filters?: SearchFilterParams;
};

export const listChannelMessages = (channelId: string, params: ListMessagesParams = {}) => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.threadRoot) qs.set('threadRoot', String(params.threadRoot));
  const query = qs.toString();
  return apiClient<ChannelMessagesResponse>(
    `/discussions/channels/${channelId}/messages${query ? `?${query}` : ''}`
  );
};

export const searchChannelMessages = (
  channelId: string,
  q: string,
  filters?: SearchFilterParams,
  limit = 20
) =>
  apiClient<SearchResponse>(
    `/discussions/channels/${channelId}/search?${buildSearchQS(q, limit, filters)}`
  );

export const searchServerMessages = (
  serverId: string,
  q: string,
  filters?: SearchFilterParams,
  limit = 20
) =>
  apiClient<SearchResponse>(
    `/discussions/servers/${serverId}/search?${buildSearchQS(q, limit, filters)}`
  );

export const sendChannelMessage = (channelId: string, body: SendMessagePayload) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const editMessage = (messageId: string, body: EditMessagePayload) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteMessage = (messageId: string) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/messages/${messageId}`, {
    method: 'DELETE',
  });

export const listReactions = (messageId: string) =>
  apiClient<{ reactions: MessageReaction[] }>(
    `/discussions/messages/${messageId}/reactions`
  );

export const addReaction = (messageId: string, emoji: string) =>
  apiClient<{ reactions: MessageReaction[] }>(
    `/discussions/messages/${messageId}/reactions`,
    { method: 'POST', body: JSON.stringify({ emoji }) }
  );

export const removeReaction = (messageId: string, emoji: string) =>
  apiClient<{ reactions: MessageReaction[] }>(
    `/discussions/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: 'DELETE' }
  );
