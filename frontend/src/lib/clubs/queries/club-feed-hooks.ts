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

const reactionPath = (serverId: number | string, messageId: string) =>
  `/discussions/groups/${encodeURIComponent(String(serverId))}/messages/${encodeURIComponent(
    messageId
  )}/reactions`;

export const addClubReaction = (
  serverId: number | string,
  messageId: string,
  emoji: string
) =>
  apiClient(reactionPath(serverId, messageId), {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });

export const removeClubReaction = (
  serverId: number | string,
  messageId: string,
  emoji: string
) =>
  apiClient(
    `${reactionPath(serverId, messageId)}?emoji=${encodeURIComponent(emoji)}`,
    { method: 'DELETE' }
  );

/**
 * Toggles one emoji on a post. `mine` says whether the viewer has already
 * reacted with it, which decides add vs remove — the endpoint has no toggle
 * verb of its own.
 */
export function useToggleClubReaction(serverId?: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { messageId: string; emoji: string; mine: boolean }) =>
      args.mine
        ? removeClubReaction(serverId as number, args.messageId, args.emoji)
        : addClubReaction(serverId as number, args.messageId, args.emoji),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubFeedKey(serverId ?? 0) });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to react'),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Comments — replies to a post. Backed by the same group-message endpoints
// as the top-level feed: a comment is just a message with parentMessageId
// set, and GET ?parentId= scopes the list to one post's thread.
// ────────────────────────────────────────────────────────────────────────────

export const clubCommentsKey = (serverId: number | string, messageId: string) =>
  ['clubs', 'feed', String(serverId), 'comments', messageId] as const;

export const listClubComments = (serverId: number | string, messageId: string) =>
  apiClient<ClubFeedResponse>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages?parentId=${encodeURIComponent(
      messageId
    )}&limit=100`
  );

export const postClubComment = (
  serverId: number | string,
  messageId: string,
  content: string
) =>
  apiClient<DiscussionMessage>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages`,
    { method: 'POST', body: JSON.stringify({ content, parentMessageId: messageId }) }
  );

/** Comment thread for one post. Only fetched once the thread is opened. */
export function useClubComments(
  serverId: number | null | undefined,
  messageId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: clubCommentsKey(serverId ?? 0, messageId),
    queryFn: () => listClubComments(serverId as number, messageId),
    enabled: enabled && Number.isFinite(serverId) && Number(serverId) > 0,
  });
}

export function usePostClubComment(serverId?: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { messageId: string; content: string }) =>
      postClubComment(serverId as number, args.messageId, args.content),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: clubCommentsKey(serverId ?? 0, variables.messageId) });
      // Refreshes the post's threadPreview.replyCount shown in the collapsed state.
      qc.invalidateQueries({ queryKey: clubFeedKey(serverId ?? 0) });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to comment'),
  });
}
