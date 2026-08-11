import { apiClient } from '@/lib/api-client';
import type {
  ChannelAuditLogResponse,
  ChannelDetailResponse,
  ChannelListResponse,
  ChannelMembersResponse,
  ChannelOverwriteUpsertResponse,
  ChannelOverwritesResponse,
  DiscussionChannel,
  DiscussionOverwriteTarget,
  ServerDetailResponse,
  ServerListResponse,
  ServerPresenceResponse,
} from '@/lib/discussions/queries/types';

export const listServers = () => apiClient<ServerListResponse>('/discussions/servers');

export const getServer = (serverId: string) =>
  apiClient<ServerDetailResponse>(`/discussions/servers/${serverId}`);

export const listServerChannels = (serverId: string) =>
  apiClient<ChannelListResponse>(`/discussions/servers/${serverId}/channels`);

export const createChannel = (
  serverId: string,
  body: { name: string; topic?: string | null; categoryId?: string }
) =>
  apiClient<{ channel: DiscussionChannel }>(`/discussions/servers/${serverId}/channels`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const getChannel = (channelId: string) =>
  apiClient<ChannelDetailResponse>(`/discussions/channels/${channelId}`);

export const listChannelAuditLog = (channelId: string, cursor?: string | null) => {
  const qs = cursor != null && cursor !== '' ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiClient<ChannelAuditLogResponse>(`/discussions/channels/${channelId}/audit-log${qs}`);
};

export const updateChannel = (
  channelId: string,
  body: {
    name?: string;
    topic?: string | null;
    categoryId?: string | null;
    position?: number;
    kind?: 'TEXT' | 'ANNOUNCEMENT' | 'FORUM';
    isPrivate?: boolean;
    slowModeSeconds?: number;
  }
) =>
  apiClient<ChannelDetailResponse>(`/discussions/channels/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const archiveChannel = (channelId: string) =>
  apiClient<ChannelDetailResponse>(`/discussions/channels/${channelId}/archive`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const unarchiveChannel = (channelId: string) =>
  apiClient<ChannelDetailResponse>(`/discussions/channels/${channelId}/archive`, {
    method: 'DELETE',
  });

export const hardDeleteChannel = (channelId: string) =>
  apiClient<{ ok: true }>(`/discussions/channels/${channelId}`, { method: 'DELETE' });

export const listChannelOverwrites = (channelId: string) =>
  apiClient<ChannelOverwritesResponse>(`/discussions/channels/${channelId}/overwrites`);

export const putChannelOverwrite = (
  channelId: string,
  targetType: DiscussionOverwriteTarget,
  targetId: number,
  body: { allow: string; deny: string }
) =>
  apiClient<ChannelOverwriteUpsertResponse>(
    `/discussions/channels/${channelId}/overwrites/${targetType}/${targetId}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );

export const deleteChannelOverwrite = (
  channelId: string,
  targetType: DiscussionOverwriteTarget,
  targetId: number
) =>
  apiClient<{ ok: true }>(
    `/discussions/channels/${channelId}/overwrites/${targetType}/${targetId}`,
    { method: 'DELETE' }
  );

export const removeServerMember = (
  serverId: string,
  targetUserId: number,
  auditChannelId?: string | null
) => {
  const qs = auditChannelId ? `?auditChannelId=${encodeURIComponent(auditChannelId)}` : '';
  return apiClient<{ ok: true }>(
    `/discussions/servers/${serverId}/members/${targetUserId}${qs}`,
    { method: 'DELETE' }
  );
};

export const muteServerMember = (
  serverId: string,
  targetUserId: number,
  until: string | null,
  auditChannelId?: string | null
) =>
  apiClient<{ ok: true; mutedUntil: string | null }>(
    `/discussions/servers/${serverId}/members/${targetUserId}/mute`,
    {
      method: 'POST',
      body: JSON.stringify({
        until,
        ...(auditChannelId ? { auditChannelId } : {}),
      }),
    }
  );

export const listChannelMembers = (channelId: string) =>
  apiClient<ChannelMembersResponse>(`/discussions/channels/${channelId}/members`);

export const getServerPresence = (serverId: string) =>
  apiClient<ServerPresenceResponse>(`/discussions/groups/${serverId}/presence`);

export const getMyDiscussionStatus = async () => {
  const r = await apiClient<{ discussionCustomStatus: string | null }>(
    '/discussions/me/workspaces'
  );
  return { discussionCustomStatus: r.discussionCustomStatus ?? null };
};

export const updateMyDiscussionStatus = (status: string | null) =>
  apiClient<{ discussionCustomStatus: string | null }>('/discussions/me/status', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
