/**
 * Club feed — the in-club post composer and message list.
 *
 * A club is backed by a DiscussionGroup (`club.serverId`), so the feed reads and
 * writes through the group-feed endpoints rather than a club-specific route.
 * Members are granted `canPost` when they join, which is what the POST enforces.
 */

import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { DiscussionMessage } from '@/lib/discussions/queries/types';

export type ClubFeedResponse = {
  results: DiscussionMessage[];
  meta: { nextCursor: string | null; hasMore: boolean };
};

export const clubFeedKey = (serverId: number | string) =>
  ['clubs', 'feed', String(serverId)] as const;

export const listClubFeed = (serverId: number | string, limit = 30) =>
  apiClient<ClubFeedResponse>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages?limit=${limit}`
  );

export const postClubMessage = (
  serverId: number | string,
  content: string,
  attachmentIds?: string[]
) =>
  apiClient<DiscussionMessage>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages`,
    { method: 'POST', body: JSON.stringify({ content, attachmentIds: attachmentIds ?? [] }) }
  );

/** Feed for a club. Disabled until the club has a provisioned server. */
export function useClubFeed(serverId?: number | null) {
  return useQuery({
    queryKey: clubFeedKey(serverId ?? 0),
    queryFn: () => listClubFeed(serverId as number),
    enabled: Number.isFinite(serverId) && Number(serverId) > 0,
  });
}

export function usePostClubMessage(serverId?: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { content: string; attachmentIds?: string[] }) =>
      postClubMessage(serverId as number, args.content, args.attachmentIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubFeedKey(serverId ?? 0) });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to post'),
  });
}
