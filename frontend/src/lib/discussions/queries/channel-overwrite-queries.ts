import { useQuery } from '@/lib/async-query';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import { listChannelOverwrites } from '@/lib/discussions/queries/service';

export const useChannelOverwrites = (
  channelId: string | null | undefined,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: discussionKeys.channelOverwrites(channelId ?? ''),
    queryFn: () => listChannelOverwrites(channelId as string),
    enabled: (options?.enabled ?? true) && !!channelId,
    staleTime: 30_000
  });
