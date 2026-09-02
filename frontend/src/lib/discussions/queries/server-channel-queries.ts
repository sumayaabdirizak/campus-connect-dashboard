import { useQuery } from '@/lib/async-query';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
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
} from '@/lib/discussions/queries/service';

export const useServers = () =>
  useQuery({
    queryKey: discussionKeys.servers(),
    queryFn: () => listServers(),
    staleTime: 30_000
  });

export const useServer = (serverId: string | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.server(serverId ?? ''),
    queryFn: () => getServer(serverId as string),
    enabled: !!serverId,
    staleTime: 30_000
  });

export const useServerPresence = (serverId: string | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.serverPresence(serverId ?? ''),
    queryFn: () => getServerPresence(serverId as string),
    enabled: !!serverId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

export const useServerChannels = (serverId: string | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.serverChannels(serverId ?? ''),
    queryFn: () => listServerChannels(serverId as string),
    enabled: !!serverId,
    staleTime: 30_000
  });

export const useChannel = (channelId: string | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.channel(channelId ?? ''),
    queryFn: () => getChannel(channelId as string),
    enabled: !!channelId,
    staleTime: 30_000
  });

export const useChannelMembers = (channelId: string | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.channelMembers(channelId ?? ''),
    queryFn: () => listChannelMembers(channelId as string),
    enabled: !!channelId,
    staleTime: 60_000
  });

export const useChannelPins = (channelId: string | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.channelPins(channelId ?? ''),
    queryFn: () => listChannelPins(channelId as string),
    enabled: !!channelId,
    staleTime: 30_000
  });

// Messages — initial page only. Pagination ("load more") is owned by a
// dedicated hook in hooks/use-channel-messages.ts because async-query.ts has
// no built-in infinite query support.

export const useChannelMessagesPage = (
  channelId: string | null | undefined,
  params: ListMessagesParams = {}
) =>
  useQuery({
    queryKey: discussionKeys.channelMessages(channelId ?? '', params),
    queryFn: () => listChannelMessages(channelId as string, params),
    enabled: !!channelId
  });

function hasAnyFilter(filters?: SearchFilterParams): boolean {
  if (!filters) return false;
  return Boolean(filters.from || filters.has || filters.before || filters.after);
}

export const useChannelSearch = (
  channelId: string | null | undefined,
  q: string,
  filters?: SearchFilterParams,
  limit = 20
) => {
  const trimmed = q.trim();
  return useQuery({
    queryKey: discussionKeys.channelSearch(channelId ?? '', trimmed, filters),
    queryFn: () =>
      searchChannelMessages(channelId as string, trimmed, filters, limit),
    enabled:
      !!channelId &&
      (trimmed.length >= 2 || hasAnyFilter(filters)),
    staleTime: 30_000
  });
};

export const useServerSearch = (
  serverId: string | null | undefined,
  q: string,
  filters?: SearchFilterParams,
  limit = 20
) => {
  const trimmed = q.trim();
  return useQuery({
    queryKey: discussionKeys.serverSearch(serverId ?? '', trimmed, filters),
    queryFn: () =>
      searchServerMessages(serverId as string, trimmed, filters, limit),
    enabled:
      !!serverId &&
      (trimmed.length >= 2 || hasAnyFilter(filters)),
    staleTime: 30_000
  });
};

export const useReactions = (messageId: string | null | undefined) =>
  useQuery({
    queryKey: discussionKeys.reactions(messageId ?? ''),
    queryFn: () => listReactions(messageId as string),
    enabled: !!messageId,
    staleTime: 30_000
  });
