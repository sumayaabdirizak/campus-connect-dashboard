/**
 * Thin fetch wrappers around /api/discussions/*.
 *
 * Pure functions — no caching, no React. The cache layer lives in
 * api/queries.ts. Components should import from queries.ts; this file
 * exists so server components and tests can call the endpoints directly.
 */

import { apiClient } from '@/lib/api-client';
import type {
  ChannelAuditLogResponse,
  ChannelDetailResponse,
  ChannelListResponse,
  ChannelMembersResponse,
  ChannelMessagesResponse,
  ChannelOverwriteUpsertResponse,
  ChannelOverwritesResponse,
  ChannelPinsResponse,
  CreateGroupDmPayload,
  DiscussionChannel,
  DiscussionMessage,
  DiscussionOverwriteTarget,
  EditMessagePayload,
  GroupDmCandidatesResponse,
  GroupDmDetailResponse,
  GroupDmListResponse,
  GroupDmMessagesResponse,
  MarkReadPayload,
  MessageReaction,
  NotificationsListResponse,
  SendMessagePayload,
  ServerDetailResponse,
  ServerListResponse,
  ServerPresenceResponse,
  UnreadCountResponse
} from './types';

// ────────────────────────────────────────────────────────────────────────────
// Servers / channels
// ────────────────────────────────────────────────────────────────────────────

export const listServers = () => apiClient<ServerListResponse>('/discussions/servers');

export const getServer = (serverId: number) =>
  apiClient<ServerDetailResponse>(`/discussions/servers/${serverId}`);

export const listServerChannels = (serverId: number) =>
  apiClient<ChannelListResponse>(`/discussions/servers/${serverId}/channels`);

export const createChannel = (
  serverId: number,
  body: { name: string; topic?: string | null; categoryId?: number }
) =>
  apiClient<{ channel: DiscussionChannel }>(`/discussions/servers/${serverId}/channels`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

export const getChannel = (channelId: number) =>
  apiClient<ChannelDetailResponse>(`/discussions/channels/${channelId}`);

export const listChannelAuditLog = (channelId: number, cursor?: string | null) => {
  const qs =
    cursor != null && cursor !== ''
      ? `?cursor=${encodeURIComponent(cursor)}`
      : '';
  return apiClient<ChannelAuditLogResponse>(
    `/discussions/channels/${channelId}/audit-log${qs}`
  );
};

export const updateChannel = (
  channelId: number,
  body: {
    name?: string;
    topic?: string | null;
    categoryId?: number | null;
    position?: number;
    kind?: 'TEXT' | 'ANNOUNCEMENT' | 'FORUM';
    isPrivate?: boolean;
    slowModeSeconds?: number;
  }
) =>
  apiClient<ChannelDetailResponse>(`/discussions/channels/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });

export const archiveChannel = (channelId: number) =>
  apiClient<ChannelDetailResponse>(
    `/discussions/channels/${channelId}/archive`,
    { method: 'POST', body: JSON.stringify({}) }
  );

export const unarchiveChannel = (channelId: number) =>
  apiClient<ChannelDetailResponse>(
    `/discussions/channels/${channelId}/archive`,
    { method: 'DELETE' }
  );

/** Permanently removes an archived channel (server + channel perms). */
export const hardDeleteChannel = (channelId: number) =>
  apiClient<{ ok: true }>(`/discussions/channels/${channelId}`, {
    method: 'DELETE'
  });

// ────────────────────────────────────────────────────────────────────────────
// Channel permission overwrites (A7)
// ────────────────────────────────────────────────────────────────────────────

export const listChannelOverwrites = (channelId: number) =>
  apiClient<ChannelOverwritesResponse>(
    `/discussions/channels/${channelId}/overwrites`
  );

export const putChannelOverwrite = (
  channelId: number,
  targetType: DiscussionOverwriteTarget,
  targetId: number,
  body: { allow: string; deny: string }
) =>
  apiClient<ChannelOverwriteUpsertResponse>(
    `/discussions/channels/${channelId}/overwrites/${targetType}/${targetId}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );

export const deleteChannelOverwrite = (
  channelId: number,
  targetType: DiscussionOverwriteTarget,
  targetId: number
) =>
  apiClient<{ ok: true }>(
    `/discussions/channels/${channelId}/overwrites/${targetType}/${targetId}`,
    { method: 'DELETE' }
  );

export const removeServerMember = (
  serverId: number,
  targetUserId: number,
  auditChannelId?: number | null
) => {
  const qs =
    auditChannelId != null &&
    Number.isFinite(Number(auditChannelId)) &&
    Number(auditChannelId) > 0
      ? `?auditChannelId=${encodeURIComponent(String(auditChannelId))}`
      : '';
  return apiClient<{ ok: true }>(
    `/discussions/servers/${serverId}/members/${targetUserId}${qs}`,
    { method: 'DELETE' }
  );
};

/**
 * Mute (or lift mute on) a server member. Backend stores `mutedUntil` on the
 * membership row; pass `until: null` to lift the mute early.
 *
 * See backend/src/controllers/discussions/servers.js
 * (`POST /servers/:serverId/members/:targetUserId/mute`).
 */
export const muteServerMember = (
  serverId: number,
  targetUserId: number,
  until: string | null,
  auditChannelId?: number | null
) =>
  apiClient<{ ok: true; mutedUntil: string | null }>(
    `/discussions/servers/${serverId}/members/${targetUserId}/mute`,
    {
      method: 'POST',
      body: JSON.stringify({
        until,
        ...(auditChannelId != null &&
        Number.isFinite(Number(auditChannelId)) &&
        Number(auditChannelId) > 0
          ? { auditChannelId: Number(auditChannelId) }
          : {})
      })
    }
  );

export const listChannelMembers = (channelId: number) =>
  apiClient<ChannelMembersResponse>(`/discussions/channels/${channelId}/members`);

export const getServerPresence = (serverId: number) =>
  apiClient<ServerPresenceResponse>(`/discussions/groups/${serverId}/presence`);

// Custom status — surfaces User.discussionCustomStatus.
// "do not disturb" / "dnd" / strings containing "do not disturb" trigger
// the DND presence state on the backend (discussionPresence.js).
export const getMyDiscussionStatus = async () => {
  const r = await apiClient<{ discussionCustomStatus: string | null }>(
    '/discussions/me/workspaces'
  );
  return { discussionCustomStatus: r.discussionCustomStatus ?? null };
};

export const updateMyDiscussionStatus = (status: string | null) =>
  apiClient<{ discussionCustomStatus: string | null }>(
    '/discussions/me/status',
    {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }
  );

// ────────────────────────────────────────────────────────────────────────────
// Messages
// ────────────────────────────────────────────────────────────────────────────

export type ListMessagesParams = {
  limit?: number;
  cursor?: string | null;
  threadRoot?: number | null;
};

export const listChannelMessages = (channelId: number, params: ListMessagesParams = {}) => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.threadRoot) qs.set('threadRoot', String(params.threadRoot));
  const query = qs.toString();
  return apiClient<ChannelMessagesResponse>(
    `/discussions/channels/${channelId}/messages${query ? `?${query}` : ''}`
  );
};

export type SearchFilterParams = {
  from?: string;
  has?: 'image' | 'video' | 'file' | 'attachment';
  before?: string;
  after?: string;
};

function buildSearchQS(
  q: string,
  limit: number,
  filters?: SearchFilterParams
): string {
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

export const searchChannelMessages = (
  channelId: number,
  q: string,
  filters?: SearchFilterParams,
  limit = 20
) =>
  apiClient<SearchResponse>(
    `/discussions/channels/${channelId}/search?${buildSearchQS(q, limit, filters)}`
  );

export const searchServerMessages = (
  serverId: number,
  q: string,
  filters?: SearchFilterParams,
  limit = 20
) =>
  apiClient<SearchResponse>(
    `/discussions/servers/${serverId}/search?${buildSearchQS(q, limit, filters)}`
  );

export const sendChannelMessage = (channelId: number, body: SendMessagePayload) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

export const editMessage = (messageId: number, body: EditMessagePayload) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });

export const deleteMessage = (messageId: number) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/messages/${messageId}`, {
    method: 'DELETE'
  });

// ────────────────────────────────────────────────────────────────────────────
// Reactions
// ────────────────────────────────────────────────────────────────────────────

export const listReactions = (messageId: number) =>
  apiClient<{ reactions: MessageReaction[] }>(
    `/discussions/messages/${messageId}/reactions`
  );

export const addReaction = (messageId: number, emoji: string) =>
  apiClient<{ reactions: MessageReaction[] }>(
    `/discussions/messages/${messageId}/reactions`,
    { method: 'POST', body: JSON.stringify({ emoji }) }
  );

export const removeReaction = (messageId: number, emoji: string) =>
  apiClient<{ reactions: MessageReaction[] }>(
    `/discussions/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: 'DELETE' }
  );

// ────────────────────────────────────────────────────────────────────────────
// Pins
// ────────────────────────────────────────────────────────────────────────────

export const listChannelPins = (channelId: number) =>
  apiClient<ChannelPinsResponse>(`/discussions/channels/${channelId}/pins`);

export const pinMessage = (channelId: number, messageId: number) =>
  apiClient<{ pin: unknown }>(`/discussions/channels/${channelId}/pins`, {
    method: 'POST',
    body: JSON.stringify({ messageId })
  });

export const unpinMessage = (channelId: number, messageId: number) =>
  apiClient<{ ok: true }>(`/discussions/channels/${channelId}/pins/${messageId}`, {
    method: 'DELETE'
  });

// ────────────────────────────────────────────────────────────────────────────
// Group DMs
// ────────────────────────────────────────────────────────────────────────────

export const listGroupDms = () =>
  apiClient<GroupDmListResponse>('/discussions/group-dms');

export const getGroupDm = (groupDmId: number) =>
  apiClient<GroupDmDetailResponse>(`/discussions/group-dms/${groupDmId}`);

export const createGroupDm = (body: CreateGroupDmPayload) =>
  apiClient<{ groupDm: GroupDmDetailResponse['groupDm'] }>('/discussions/group-dms', {
    method: 'POST',
    body: JSON.stringify(body)
  });

export const listGroupDmMessages = (
  groupDmId: number,
  params: { limit?: number; cursor?: string | null } = {}
) => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.cursor) qs.set('cursor', params.cursor);
  const query = qs.toString();
  return apiClient<GroupDmMessagesResponse>(
    `/discussions/group-dms/${groupDmId}/messages${query ? `?${query}` : ''}`
  );
};

export const sendGroupDmMessage = (
  groupDmId: number,
  body: { content?: string | null; messageType?: 'TEXT' | 'MEDIA' | 'SYSTEM'; parentMessageId?: number | null }
) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/group-dms/${groupDmId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

export const addGroupDmMembers = (groupDmId: number, userIds: number[]) =>
  apiClient<{ groupDm: GroupDmDetailResponse['groupDm'] }>(
    `/discussions/group-dms/${groupDmId}/members`,
    { method: 'POST', body: JSON.stringify({ userIds }) }
  );

export const removeGroupDmMember = (groupDmId: number, targetUserId: number) =>
  apiClient<{ ok: true }>(`/discussions/group-dms/${groupDmId}/members/${targetUserId}`, {
    method: 'DELETE'
  });

// Self-leave (B2). The caller exits the group DM; if they were OWNER, the
// backend transfers ownership to the oldest remaining member, or archives
// the DM when no one is left.
export const leaveGroupDm = (groupDmId: number) =>
  apiClient<{ ok: true; archived: boolean; newOwnerId: number | null }>(
    `/discussions/group-dms/${groupDmId}/leave`,
    { method: 'POST', body: JSON.stringify({}) }
  );

export type GroupDmReceipt = {
  userId: number;
  messageId: number;
  readAt: string;
};

export const getGroupDmReceipts = (groupDmId: number) =>
  apiClient<{ results: GroupDmReceipt[] }>(
    `/discussions/group-dms/${groupDmId}/receipts`
  );

export const searchGroupDmCandidates = (q?: string) => {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiClient<GroupDmCandidatesResponse>(
    `/discussions/group-dms/member-candidates${query}`
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Notifications + unread
// ────────────────────────────────────────────────────────────────────────────

export const getUnreadCount = () =>
  apiClient<UnreadCountResponse>('/discussions/me/notifications/unread-count');

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
    body: JSON.stringify(body)
  });
