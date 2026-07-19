import type { ListMessagesParams } from './service';
import type { SearchFilterParams } from './service';

export const discussionKeys = {
  all: ['discussions'] as const,

  servers: () => [...discussionKeys.all, 'servers'] as const,
  server: (serverId: number) => [...discussionKeys.servers(), serverId] as const,
  serverChannels: (serverId: number) =>
    [...discussionKeys.server(serverId), 'channels'] as const,
  serverPresence: (serverId: number) =>
    [...discussionKeys.server(serverId), 'presence'] as const,

  channel: (channelId: number) => [...discussionKeys.all, 'channel', channelId] as const,
  channelMembers: (channelId: number) =>
    [...discussionKeys.channel(channelId), 'members'] as const,
  channelPins: (channelId: number) =>
    [...discussionKeys.channel(channelId), 'pins'] as const,
  channelOverwrites: (channelId: number) =>
    [...discussionKeys.channel(channelId), 'overwrites'] as const,
  channelAuditLog: (channelId: number) =>
    [...discussionKeys.channel(channelId), 'audit-log'] as const,

  channelMessages: (channelId: number, params?: ListMessagesParams) =>
    [
      ...discussionKeys.channel(channelId),
      'messages',
      params?.threadRoot ?? null,
      params?.cursor ?? null,
      params?.limit ?? null
    ] as const,
  channelSearch: (channelId: number, q: string, filters?: SearchFilterParams) =>
    [
      ...discussionKeys.channel(channelId),
      'search',
      q,
      filters?.from ?? '',
      filters?.has ?? '',
      filters?.before ?? '',
      filters?.after ?? ''
    ] as const,
  serverSearch: (serverId: number, q: string, filters?: SearchFilterParams) =>
    [
      ...discussionKeys.server(serverId),
      'search',
      q,
      filters?.from ?? '',
      filters?.has ?? '',
      filters?.before ?? '',
      filters?.after ?? ''
    ] as const,
  threadMessages: (channelId: number, threadRoot: number) =>
    [...discussionKeys.channel(channelId), 'thread', threadRoot] as const,

  reactions: (messageId: number) =>
    [...discussionKeys.all, 'message', messageId, 'reactions'] as const,

  groupDms: () => [...discussionKeys.all, 'group-dms'] as const,
  groupDm: (groupDmId: number) => [...discussionKeys.groupDms(), groupDmId] as const,
  groupDmMessages: (groupDmId: number, cursor?: string | null) =>
    [...discussionKeys.groupDm(groupDmId), 'messages', cursor ?? null] as const,
  groupDmCandidates: (q?: string) =>
    [...discussionKeys.groupDms(), 'candidates', q ?? ''] as const,

  unreadCount: () => [...discussionKeys.all, 'unread-count'] as const,
  unreadSummary: () => [...discussionKeys.all, 'unread-summary'] as const,
  myStatus: () => [...discussionKeys.all, 'my-status'] as const,
  notifications: (filter: 'all' | 'unread' = 'all') =>
    [...discussionKeys.all, 'notifications', filter] as const
};
