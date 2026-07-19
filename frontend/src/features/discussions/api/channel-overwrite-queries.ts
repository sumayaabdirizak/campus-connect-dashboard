import { useQuery } from '@/lib/async-query';
import { discussionKeys } from './discussion-keys';
import { listChannelOverwrites } from './service';

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
