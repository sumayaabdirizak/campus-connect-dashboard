import { useQuery } from '@/lib/async-query';
import { discussionKeys } from './discussion-keys';
import {
  getChannel,
  getServer,
  getServerPresence,
  listChannelMembers,
  listChannelMessages,
  listChannelPins,
  listReactions,
  listServerChannels,
  listServers,
  searchChannelMessages,
  searchServerMessages,
  type ListMessagesParams,
  type SearchFilterParams
} from './service';

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

// Messages — initial page only. Pagination ("load more") is owned by a
// dedicated hook in hooks/use-channel-messages.ts because async-query.ts has
// no built-in infinite query support.

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
