/**
 * React-query hooks + key factory for the Discussions module.
 *
 * Components should import from this file (not from service.ts directly) so
 * that mutations stay in sync with the cache and so that socket events from
 * api/socket.ts can patch the same query keys.
 */

import {
  getQueryData,
  setQueryData,
  useMutation,
  useQuery,
  useQueryClient
} from '@/lib/async-query';
import type { QueryKey } from '@/lib/async-query';
import { toast } from 'sonner';

import {
  addGroupDmMembers,
  addReaction,
  archiveChannel,
  createChannel,
  createGroupDm,
  deleteChannelOverwrite,
  deleteMessage,
  editMessage,
  getChannel,
  getGroupDm,
  getMyDiscussionStatus,
  getServer,
  getServerPresence,
  getUnreadCount,
  hardDeleteChannel,
  listChannelMembers,
  listChannelMessages,
  listChannelOverwrites,
  listChannelPins,
  leaveGroupDm,
  listGroupDms,
  listNotifications,
  listReactions,
  listServerChannels,
  listServers,
  markNotificationsRead,
  putChannelOverwrite,
  searchChannelMessages,
  searchServerMessages,
  unarchiveChannel,
  updateMyDiscussionStatus,
  pinMessage,
  muteServerMember,
  removeGroupDmMember,
  removeReaction,
  removeServerMember,
  searchGroupDmCandidates,
  sendChannelMessage,
  sendGroupDmMessage,
  unpinMessage,
  updateChannel,
  type ListMessagesParams
} from './service';
import type {
  ChannelMembersResponse,
  ChannelMessagesResponse,
  ChannelOverwritesResponse,
  ChannelPin,
  ChannelPinsResponse,
  CreateGroupDmPayload,
  DiscussionMessage,
  DiscussionOverwrite,
  DiscussionOverwriteTarget,
  EditMessagePayload,
  GroupDmMessagesResponse,
  MarkReadPayload,
  MessageReaction,
  SendMessagePayload,
  UnreadSocketPayload
} from './types';
import type { SearchFilterParams } from './service';
export type { SearchFilterParams } from './service';

// ────────────────────────────────────────────────────────────────────────────
// Key factory
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Server / channel queries
// ────────────────────────────────────────────────────────────────────────────

export const useServers = () =>
  useQuery({
    queryKey: discussionKeys.servers(),
    queryFn: () => listServers(),
    staleTime: 30_000
  });

export const useServer = (serverId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.server(Number(serverId)),
    queryFn: () => getServer(Number(serverId)),
    enabled: Number.isFinite(Number(serverId)) && Number(serverId) > 0,
    staleTime: 30_000
  });

export const useServerPresence = (serverId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.serverPresence(Number(serverId)),
    queryFn: () => getServerPresence(Number(serverId)),
    enabled: Number.isFinite(Number(serverId)) && Number(serverId) > 0,
    refetchInterval: 30_000, // poll every 30s; backend has no socket fanout to channel rooms yet
    staleTime: 15_000
  });

export const useServerChannels = (serverId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.serverChannels(Number(serverId)),
    queryFn: () => listServerChannels(Number(serverId)),
    enabled: Number.isFinite(Number(serverId)) && Number(serverId) > 0,
    staleTime: 30_000
  });

export const useChannel = (channelId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.channel(Number(channelId)),
    queryFn: () => getChannel(Number(channelId)),
    enabled: Number.isFinite(Number(channelId)) && Number(channelId) > 0,
    staleTime: 30_000
  });

export const useChannelMembers = (channelId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.channelMembers(Number(channelId)),
    queryFn: () => listChannelMembers(Number(channelId)),
    enabled: Number.isFinite(Number(channelId)) && Number(channelId) > 0,
    staleTime: 60_000
  });

export const useChannelPins = (channelId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.channelPins(Number(channelId)),
    queryFn: () => listChannelPins(Number(channelId)),
    enabled: Number.isFinite(Number(channelId)) && Number(channelId) > 0,
    staleTime: 30_000
  });

// ────────────────────────────────────────────────────────────────────────────
// Messages — initial page only. Pagination ("load more") is owned by a
// dedicated hook in hooks/use-channel-messages.ts because async-query.ts has
// no built-in infinite query support.
// ────────────────────────────────────────────────────────────────────────────

export const useChannelMessagesPage = (
  channelId: number | null | undefined,
  params: ListMessagesParams = {}
) =>
  useQuery({
    queryKey: discussionKeys.channelMessages(Number(channelId), params),
    queryFn: () => listChannelMessages(Number(channelId), params),
    enabled: Number.isFinite(Number(channelId)) && Number(channelId) > 0
  });

function hasAnyFilter(filters?: SearchFilterParams): boolean {
  if (!filters) return false;
  return Boolean(filters.from || filters.has || filters.before || filters.after);
}

export const useChannelSearch = (
  channelId: number | null | undefined,
  q: string,
  filters?: SearchFilterParams,
  limit = 20
) => {
  const trimmed = q.trim();
  return useQuery({
    queryKey: discussionKeys.channelSearch(Number(channelId), trimmed, filters),
    queryFn: () =>
      searchChannelMessages(Number(channelId), trimmed, filters, limit),
    enabled:
      Number.isFinite(Number(channelId)) &&
      Number(channelId) > 0 &&
      (trimmed.length >= 2 || hasAnyFilter(filters)),
    staleTime: 30_000
  });
};

export const useServerSearch = (
  serverId: number | null | undefined,
  q: string,
  filters?: SearchFilterParams,
  limit = 20
) => {
  const trimmed = q.trim();
  return useQuery({
    queryKey: discussionKeys.serverSearch(Number(serverId), trimmed, filters),
    queryFn: () =>
      searchServerMessages(Number(serverId), trimmed, filters, limit),
    enabled:
      Number.isFinite(Number(serverId)) &&
      Number(serverId) > 0 &&
      (trimmed.length >= 2 || hasAnyFilter(filters)),
    staleTime: 30_000
  });
};

export const useReactions = (messageId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.reactions(Number(messageId)),
    queryFn: () => listReactions(Number(messageId)),
    enabled: Number.isFinite(Number(messageId)) && Number(messageId) > 0,
    staleTime: 30_000
  });

// ────────────────────────────────────────────────────────────────────────────
// Group DMs
// ────────────────────────────────────────────────────────────────────────────

export const useGroupDms = () =>
  useQuery({
    queryKey: discussionKeys.groupDms(),
    queryFn: () => listGroupDms(),
    staleTime: 30_000
  });

export const useGroupDm = (groupDmId: number | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.groupDm(Number(groupDmId)),
    queryFn: () => getGroupDm(Number(groupDmId)),
    enabled: Number.isFinite(Number(groupDmId)) && Number(groupDmId) > 0,
    staleTime: 30_000
  });

export const useGroupDmCandidates = (q: string) =>
  useQuery({
    queryKey: discussionKeys.groupDmCandidates(q),
    queryFn: () => searchGroupDmCandidates(q),
    staleTime: 60_000
  });

// ────────────────────────────────────────────────────────────────────────────
// Notifications + unread
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────────────────────────────

export const useSendChannelMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendMessagePayload) => sendChannelMessage(channelId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to send message', { description: error.message });
    }
  });
};

export const useEditMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: number; body: EditMessagePayload }) =>
      editMessage(messageId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to edit message', { description: error.message });
    }
  });
};

export const useDeleteMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) => deleteMessage(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete message', { description: error.message });
    }
  });
};

export const useAddReaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      addReaction(messageId, emoji),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.reactions(vars.messageId) });
    }
  });
};

export const useRemoveReaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      removeReaction(messageId, emoji),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.reactions(vars.messageId) });
    }
  });
};

/**
 * Pin a message with optimistic insertion into the channel-pins cache.
 * Caller passes the full `message` so we can render its preview in the
 * pinned strip immediately (otherwise we'd show "(loading)" until the
 * refetch). Synthetic pin id is negative so the next refetch's real id
 * cleanly displaces it.
 */
export const usePinMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId }: { messageId: number; message?: DiscussionMessage }) =>
      pinMessage(channelId, messageId),
    onMutate: ({
      messageId,
      message
    }: {
      messageId: number;
      message?: DiscussionMessage;
    }) => {
      const key = discussionKeys.channelPins(channelId);
      const prev = qc.getQueryData<ChannelPinsResponse>(key);
      if (!prev) return { prev: undefined };
      const synthetic: ChannelPin = {
        id: -Date.now(),
        groupId: 0,
        messageId,
        pinnedAt: new Date().toISOString(),
        message:
          message ??
          ({
            id: messageId,
            channelId,
            senderId: null,
            content: null,
            messageType: 'TEXT',
            createdAt: new Date().toISOString()
          } as DiscussionMessage),
        pinnedBy: null
      };
      qc.setQueryData<ChannelPinsResponse>(key, {
        results: [synthetic, ...prev.results]
      });
      return { prev };
    },
    onError: (error, _vars, context) => {
      const ctx = context as { prev?: ChannelPinsResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(discussionKeys.channelPins(channelId), ctx.prev);
      }
      toast.error('Failed to pin message', { description: error.message });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channelPins(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
    }
  });
};

export const useUnpinMessage = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) => unpinMessage(channelId, messageId),
    onMutate: (messageId: number) => {
      const key = discussionKeys.channelPins(channelId);
      const prev = qc.getQueryData<ChannelPinsResponse>(key);
      if (!prev) return { prev: undefined };
      qc.setQueryData<ChannelPinsResponse>(key, {
        results: prev.results.filter((p) => p.messageId !== messageId)
      });
      return { prev };
    },
    onError: (error, _vars, context) => {
      const ctx = context as { prev?: ChannelPinsResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(discussionKeys.channelPins(channelId), ctx.prev);
      }
      toast.error('Failed to unpin message', { description: error.message });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.channelPins(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
    }
  });
};

export const useUpdateChannel = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      topic?: string | null;
      categoryId?: number | null;
      position?: number;
      kind?: 'TEXT' | 'ANNOUNCEMENT' | 'FORUM';
      isPrivate?: boolean;
      slowModeSeconds?: number;
    }) => updateChannel(channelId, body),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      // Category/position/visibility changes affect the channel list that
      // the sidebar renders out of the server-detail query, so refresh
      // that too. `kind` changes the icon, which also lives on that row.
      const touchesServerList =
        vars.categoryId !== undefined ||
        vars.position !== undefined ||
        vars.kind !== undefined ||
        vars.isPrivate !== undefined;
      if (touchesServerList) {
        const serverId = Number(
          (data as { channel?: { serverId?: number } })?.channel?.serverId
        );
        if (Number.isFinite(serverId) && serverId > 0) {
          qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
          qc.invalidateQueries({
            queryKey: discussionKeys.serverChannels(serverId)
          });
        } else {
          qc.invalidateQueries({ queryKey: discussionKeys.all });
        }
      }
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to update channel', { description: error.message });
    }
  });
};

export const useArchiveChannel = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (archived: boolean) =>
      archived ? archiveChannel(channelId) : unarchiveChannel(channelId),
    onSuccess: (_data, archived) => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      // Server detail caches the channel list — refresh so the sidebar
      // hides/shows it accordingly.
      qc.invalidateQueries({ queryKey: discussionKeys.all });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      toast.success(archived ? 'Channel archived' : 'Channel restored');
    },
    onError: (error: Error) => {
      toast.error('Failed to update channel', { description: error.message });
    }
  });
};

export const useHardDeleteChannel = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serverId: number) =>
      hardDeleteChannel(channelId).then(() => serverId),
    onSuccess: (serverId) => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      qc.invalidateQueries({
        queryKey: discussionKeys.serverChannels(serverId)
      });
      qc.invalidateQueries({ queryKey: discussionKeys.all });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      toast.success('Channel deleted permanently');
    },
    onError: (error: Error) => {
      toast.error('Could not delete channel', { description: error.message });
    }
  });
};

// ─── Channel permission overwrites (A7) ───────────────────────────────────

export const useChannelOverwrites = (
  channelId: number | null | undefined,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: discussionKeys.channelOverwrites(Number(channelId)),
    queryFn: () => listChannelOverwrites(Number(channelId)),
    enabled:
      (options?.enabled ?? true) &&
      Number.isFinite(Number(channelId)) &&
      Number(channelId) > 0,
    staleTime: 30_000
  });

/**
 * Upsert a per-channel overwrite. Optimistically patches the local cache so
 * the 3-state grid in the Permissions tab reacts instantly. On error the
 * cache is rolled back and a toast surfaces the reason. On success the
 * server payload replaces the optimistic row (in case the backend masked
 * incoherent bits — `deny &= ~allow` etc).
 */
export const usePutChannelOverwrite = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      targetType: DiscussionOverwriteTarget;
      targetId: number;
      allow: string;
      deny: string;
    }) =>
      putChannelOverwrite(channelId, vars.targetType, vars.targetId, {
        allow: vars.allow,
        deny: vars.deny
      }),
    onMutate: (vars) => {
      const key = discussionKeys.channelOverwrites(channelId);
      const prev = qc.getQueryData<ChannelOverwritesResponse>(key);
      const optimistic: DiscussionOverwrite = {
        // Real id will arrive on success; use a synthetic negative id so
        // existing keys don't collide and rendering keeps a stable handle.
        id: prev?.results.find(
          (r) =>
            r.targetType === vars.targetType && r.targetId === vars.targetId
        )?.id ?? -vars.targetId,
        channelId,
        targetType: vars.targetType,
        targetId: vars.targetId,
        allow: vars.allow,
        deny: vars.deny
      };
      const merged: DiscussionOverwrite[] = prev
        ? [
            ...prev.results.filter(
              (r) =>
                !(
                  r.targetType === vars.targetType &&
                  r.targetId === vars.targetId
                )
            ),
            optimistic
          ]
        : [optimistic];
      qc.setQueryData<ChannelOverwritesResponse>(key, { results: merged });
      return { prev };
    },
    onError: (error: Error, _vars, context) => {
      const ctx = context as { prev?: ChannelOverwritesResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(
          discussionKeys.channelOverwrites(channelId),
          ctx.prev
        );
      }
      toast.error('Failed to save overwrite', { description: error.message });
    },
    onSuccess: (data) => {
      const key = discussionKeys.channelOverwrites(channelId);
      const cur = qc.getQueryData<ChannelOverwritesResponse>(key);
      const row = data.overwrite;
      const merged: DiscussionOverwrite[] = cur
        ? [
            ...cur.results.filter(
              (r) =>
                !(
                  r.targetType === row.targetType &&
                  r.targetId === row.targetId
                )
            ),
            row
          ]
        : [row];
      qc.setQueryData<ChannelOverwritesResponse>(key, { results: merged });
      // `myPermissions` on the channel detail derives from overwrites server
      // side, so the next channel fetch should re-evaluate it.
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
    }
  });
};

export const useDeleteChannelOverwrite = (channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      targetType: DiscussionOverwriteTarget;
      targetId: number;
      /** When true, skip the success toast (e.g. lock-channel cleanup). */
      quiet?: boolean;
    }) => deleteChannelOverwrite(channelId, vars.targetType, vars.targetId),
    onMutate: (vars) => {
      const key = discussionKeys.channelOverwrites(channelId);
      const prev = qc.getQueryData<ChannelOverwritesResponse>(key);
      if (prev) {
        qc.setQueryData<ChannelOverwritesResponse>(key, {
          results: prev.results.filter(
            (r) =>
              !(
                r.targetType === vars.targetType &&
                r.targetId === vars.targetId
              )
          )
        });
      }
      return { prev };
    },
    onError: (error: Error, _vars, context) => {
      const ctx = context as { prev?: ChannelOverwritesResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(
          discussionKeys.channelOverwrites(channelId),
          ctx.prev
        );
      }
      toast.error('Failed to remove overwrite', { description: error.message });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      if (!vars.quiet) {
        toast.success('Overwrite removed');
      }
    }
  });
};

export const useRemoveServerMember = (serverId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      removeServerMember(serverId, targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      qc.invalidateQueries({ queryKey: discussionKeys.serverPresence(serverId) });
      qc.invalidateQueries({ queryKey: [...discussionKeys.all, 'channel'] });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove member', { description: error.message });
    }
  });
};

/**
 * Kick a member, scoped to a channel-members view so the row vanishes
 * optimistically. Used by the Manage Channel → Members tab.
 *
 * Mirrors `useRemoveServerMember` but adds an optimistic snapshot/rollback
 * around the `channelMembers(channelId)` cache so the list reacts the moment
 * the dean clicks Confirm.
 */
export const useKickServerMember = (serverId: number, channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) =>
      removeServerMember(serverId, targetUserId, channelId),
    onMutate: (targetUserId: number) => {
      const key = discussionKeys.channelMembers(channelId);
      const prev = qc.getQueryData<ChannelMembersResponse>(key);
      if (!prev) return { prev: undefined };
      qc.setQueryData<ChannelMembersResponse>(key, {
        results: prev.results.filter(
          (m) => Number(m.userId) !== Number(targetUserId)
        )
      });
      return { prev };
    },
    onError: (error, _vars, context) => {
      const ctx = context as { prev?: ChannelMembersResponse } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(discussionKeys.channelMembers(channelId), ctx.prev);
      }
      toast.error('Failed to remove member', {
        description: (error as Error).message
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      qc.invalidateQueries({ queryKey: discussionKeys.serverPresence(serverId) });
      qc.invalidateQueries({
        queryKey: discussionKeys.channelMembers(channelId)
      });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      toast.success('Member removed');
    }
  });
};

/**
 * Mute (or lift the mute on) a server member.
 *
 * `until` is an ISO timestamp in the future, or `null` to lift the mute.
 * Backend rejects past timestamps and refuses to mute the server owner; we
 * surface those as toast errors.
 *
 * The endpoint doesn't yet return `mutedUntil` on the channel-members row,
 * so the visible list shape is unchanged — we just give instant toast
 * feedback and invalidate the surrounding caches for correctness.
 */
export const useMuteServerMember = (serverId: number, channelId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      targetUserId,
      until
    }: {
      targetUserId: number;
      until: string | null;
    }) => muteServerMember(serverId, targetUserId, until, channelId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: discussionKeys.channelMembers(channelId)
      });
      qc.invalidateQueries({ queryKey: discussionKeys.serverPresence(serverId) });
      qc.invalidateQueries({ queryKey: discussionKeys.channelAuditLog(channelId) });
      if (vars.until == null) {
        toast.success('Mute lifted');
      } else {
        toast.success('Member muted');
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to update mute', { description: error.message });
    }
  });
};

export const useCreateChannel = (serverId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; topic?: string | null; categoryId?: number }) =>
      createChannel(serverId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      qc.invalidateQueries({ queryKey: discussionKeys.serverChannels(serverId) });
      toast.success('Channel created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create channel', { description: error.message });
    }
  });
};

export const useCreateGroupDm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupDmPayload) => createGroupDm(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    },
    onError: (error: Error) => {
      toast.error('Failed to create group DM', { description: error.message });
    }
  });
};

export const useSendGroupDmMessage = (groupDmId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      content?: string | null;
      messageType?: 'TEXT' | 'MEDIA' | 'SYSTEM';
      parentMessageId?: number | null;
    }) => sendGroupDmMessage(groupDmId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    },
    onError: (error: Error) => {
      toast.error('Failed to send message', { description: error.message });
    }
  });
};

export const useAddGroupDmMembers = (groupDmId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: number[]) => addGroupDmMembers(groupDmId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
    }
  });
};

export const useRemoveGroupDmMember = (groupDmId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) => removeGroupDmMember(groupDmId, targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    }
  });
};

// Self-leave (B2). Returns `{ ok, archived, newOwnerId }` from the server so
// the caller can decide whether to surface "you are the new owner" / "the DM
// was archived" feedback. Invalidates the DM detail and list so any stale
// member rows / sidebar entries refresh.
export const useLeaveGroupDm = (groupDmId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => leaveGroupDm(groupDmId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    }
  });
};

export const useMyDiscussionStatus = () =>
  useQuery({
    queryKey: discussionKeys.myStatus(),
    queryFn: () => getMyDiscussionStatus(),
    staleTime: 60_000
  });

export const useUpdateMyDiscussionStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string | null) => updateMyDiscussionStatus(status),
    onMutate: (status: string | null) => {
      // Optimistic — flip the local cache so the user footer updates instantly.
      const prev = qc.getQueryData<{ discussionCustomStatus: string | null }>(
        discussionKeys.myStatus()
      );
      qc.setQueryData(discussionKeys.myStatus(), {
        discussionCustomStatus: status?.trim() || null
      });
      return prev;
    },
    onError: (_err, _vars, context) => {
      const prev = context as
        | { discussionCustomStatus: string | null }
        | undefined;
      if (prev !== undefined) {
        qc.setQueryData(discussionKeys.myStatus(), prev);
      }
      toast.error('Failed to update status');
    },
    onSuccess: (data) => {
      qc.setQueryData(discussionKeys.myStatus(), data);
    }
  });
};

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkReadPayload) => markNotificationsRead(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.unreadCount() });
      qc.invalidateQueries({ queryKey: [...discussionKeys.all, 'notifications'] });
    }
  });
};

// ────────────────────────────────────────────────────────────────────────────
// Cache patch helpers (consumed by api/socket.ts to merge realtime events)
// ────────────────────────────────────────────────────────────────────────────

export const discussionCache = {
  /** Replace or insert a message into a channel's first-page cache. */
  upsertChannelMessage(channelId: number, message: DiscussionMessage) {
    const key = discussionKeys.channelMessages(channelId, {});
    const prev = (cacheGet(key) as ChannelMessagesResponse | undefined) ?? null;
    const results = prev?.results ? [...prev.results] : [];
    const idx = results.findIndex((m) => m.id === message.id);
    if (idx >= 0) results[idx] = { ...results[idx], ...message };
    else results.push(message);
    cacheSet(key, {
      results,
      nextCursor: prev?.nextCursor ?? null,
      hasMore: prev?.hasMore ?? false,
      threadRoot: prev?.threadRoot ?? null
    } satisfies ChannelMessagesResponse);
  },

  removeChannelMessage(channelId: number, messageId: number) {
    const key = discussionKeys.channelMessages(channelId, {});
    const prev = cacheGet(key) as ChannelMessagesResponse | undefined;
    if (!prev) return;
    cacheSet(key, {
      ...prev,
      results: prev.results.map((m) =>
        m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m
      )
    });
  },

  setReactions(messageId: number, reactions: MessageReaction[]) {
    cacheSet(discussionKeys.reactions(messageId), { reactions });
  },

  upsertGroupDmMessage(groupDmId: number, message: DiscussionMessage) {
    const key = discussionKeys.groupDmMessages(groupDmId);
    const prev = (cacheGet(key) as GroupDmMessagesResponse | undefined) ?? null;
    const results = prev?.results ? [...prev.results] : [];
    const idx = results.findIndex((m) => m.id === message.id);
    if (idx >= 0) results[idx] = { ...results[idx], ...message };
    else results.push(message);
    cacheSet(key, {
      results,
      nextCursor: prev?.nextCursor ?? null,
      hasMore: prev?.hasMore ?? false
    } satisfies GroupDmMessagesResponse);
  }
};

// Internal — bridge to async-query's module-level cache without forcing
// callers to obtain a queryClient.

function cacheGet<T = unknown>(key: QueryKey): T | undefined {
  return getQueryData<T>(key);
}

function cacheSet<T>(key: QueryKey, value: T) {
  setQueryData<T>(key, value);
}
