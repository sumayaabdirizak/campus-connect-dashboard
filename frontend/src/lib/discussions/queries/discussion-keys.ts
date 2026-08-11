import type { ListMessagesParams } from '@/lib/discussions/queries/service';
import type { SearchFilterParams } from '@/lib/discussions/queries/service';

export const discussionKeys = {
  all: ['discussions'] as const,

  servers: () => [...discussionKeys.all, 'servers'] as const,
  server: (serverId: string) => [...discussionKeys.servers(), serverId] as const,
  serverChannels: (serverId: string) =>
    [...discussionKeys.server(serverId), 'channels'] as const,
  serverPresence: (serverId: string) =>
    [...discussionKeys.server(serverId), 'presence'] as const,

  channel: (channelId: string) => [...discussionKeys.all, 'channel', channelId] as const,
  channelMembers: (channelId: string) =>
    [...discussionKeys.channel(channelId), 'members'] as const,
  channelPins: (channelId: string) =>
    [...discussionKeys.channel(channelId), 'pins'] as const,
  channelOverwrites: (channelId: string) =>
    [...discussionKeys.channel(channelId), 'overwrites'] as const,
  channelAuditLog: (channelId: string) =>
    [...discussionKeys.channel(channelId), 'audit-log'] as const,

  channelMessages: (channelId: string, params?: ListMessagesParams) =>
    [
      ...discussionKeys.channel(channelId),
      'messages',
      params?.threadRoot ?? null,
      params?.cursor ?? null,
      params?.limit ?? null
    ] as const,
  channelSearch: (channelId: string, q: string, filters?: SearchFilterParams) =>
    [
      ...discussionKeys.channel(channelId),
      'search',
      q,
      filters?.from ?? '',
      filters?.has ?? '',
      filters?.before ?? '',
      filters?.after ?? ''
    ] as const,
  serverSearch: (serverId: string, q: string, filters?: SearchFilterParams) =>
    [
      ...discussionKeys.server(serverId),
      'search',
      q,
      filters?.from ?? '',
      filters?.has ?? '',
      filters?.before ?? '',
      filters?.after ?? ''
    ] as const,
  threadMessages: (channelId: string, threadRoot: string) =>
    [...discussionKeys.channel(channelId), 'thread', threadRoot] as const,

  reactions: (messageId: string) =>
    [...discussionKeys.all, 'message', messageId, 'reactions'] as const,

  groupDms: () => [...discussionKeys.all, 'group-dms'] as const,
  groupDm: (groupDmId: string) => [...discussionKeys.groupDms(), groupDmId] as const,
  groupDmMessages: (groupDmId: string, cursor?: string | null) =>
    [...discussionKeys.groupDm(groupDmId), 'messages', cursor ?? null] as const,
  groupDmCandidates: (q?: string, purpose: 'direct' | 'group' = 'direct') =>
    [...discussionKeys.groupDms(), 'candidates', purpose, q ?? ''] as const,

  unreadCount: () => [...discussionKeys.all, 'unread-count'] as const,
  unreadSummary: () => [...discussionKeys.all, 'unread-summary'] as const,
  myStatus: () => [...discussionKeys.all, 'my-status'] as const,
  notifications: (filter: 'all' | 'unread' = 'all') =>
    [...discussionKeys.all, 'notifications', filter] as const
};
