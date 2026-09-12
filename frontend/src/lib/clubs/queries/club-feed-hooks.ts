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
import { CLUB_REFETCH_INTERVAL, CLUB_STALE_MS } from './club-query-config';

/** Discussion group publicId (UUID) — never a sequential int. */
export type ClubServerId = string;

function hasClubServerId(serverId?: ClubServerId | number | null): serverId is ClubServerId {
  if (serverId == null) return false;
  const s = String(serverId).trim();
  if (!s || /^\d+$/.test(s)) return false;
  return true;
}

export type ClubFeedResponse = {
  results: DiscussionMessage[];
  meta: { nextCursor: string | null; hasMore: boolean };
};

export const clubFeedKey = (serverId: ClubServerId | number | string) =>
  ['clubs', 'feed', String(serverId)] as const;

export const listClubFeed = (serverId: ClubServerId | number | string, limit = 30) =>
  apiClient<ClubFeedResponse>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages?limit=${limit}`
  );

export const postClubMessage = (
  serverId: ClubServerId | number | string,
  content: string,
  attachmentIds?: string[]
) =>
  apiClient<DiscussionMessage>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages`,
    { method: 'POST', body: JSON.stringify({ content, attachmentIds: attachmentIds ?? [] }) }
  );

/** Feed for a club. Disabled until the club has a provisioned server (UUID). */
export function useClubFeed(serverId?: ClubServerId | number | null) {
  return useQuery({
    queryKey: clubFeedKey(serverId ?? ''),
    queryFn: () => listClubFeed(serverId as ClubServerId),
    enabled: hasClubServerId(serverId),
    staleTime: CLUB_STALE_MS,
    refetchOnWindowFocus: true,
    refetchInterval: CLUB_REFETCH_INTERVAL,
  });
}

export function usePostClubMessage(serverId?: ClubServerId | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { content: string; attachmentIds?: string[] }) =>
      postClubMessage(serverId as ClubServerId, args.content, args.attachmentIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubFeedKey(serverId ?? '') });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to post'),
  });
}

const reactionPath = (serverId: ClubServerId | number | string, messageId: string) =>
  `/discussions/groups/${encodeURIComponent(String(serverId))}/messages/${encodeURIComponent(
    messageId
  )}/reactions`;

export const addClubReaction = (
  serverId: ClubServerId | number | string,
  messageId: string,
  emoji: string
) =>
  apiClient(reactionPath(serverId, messageId), {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });

export const removeClubReaction = (
  serverId: ClubServerId | number | string,
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
export function useToggleClubReaction(serverId?: ClubServerId | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { messageId: string; emoji: string; mine: boolean }) =>
      args.mine
        ? removeClubReaction(serverId as ClubServerId, args.messageId, args.emoji)
        : addClubReaction(serverId as ClubServerId, args.messageId, args.emoji),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubFeedKey(serverId ?? '') });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to react'),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Comments — replies to a post. Backed by the same group-message endpoints
// as the top-level feed: a comment is just a message with parentMessageId
// set, and GET ?parentId= scopes the list to one post's thread.
// ────────────────────────────────────────────────────────────────────────────

export const clubCommentsKey = (serverId: ClubServerId | number | string, messageId: string) =>
  ['clubs', 'feed', String(serverId), 'comments', messageId] as const;

export const listClubComments = (serverId: ClubServerId | number | string, messageId: string) =>
  apiClient<ClubFeedResponse>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages?parentId=${encodeURIComponent(
      messageId
    )}&limit=100`
  );

export const postClubComment = (
  serverId: ClubServerId | number | string,
  messageId: string,
  content: string
) =>
  apiClient<DiscussionMessage>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages`,
    { method: 'POST', body: JSON.stringify({ content, parentMessageId: messageId }) }
  );

/** Comment thread for one post. Only fetched once the thread is opened. */
export function useClubComments(
  serverId: ClubServerId | number | null | undefined,
  messageId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: clubCommentsKey(serverId ?? '', messageId),
    queryFn: () => listClubComments(serverId as ClubServerId, messageId),
    enabled: enabled && hasClubServerId(serverId),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Post management — edit (author-only) and delete (author or moderator),
// both against the same discussion-message routes used everywhere else.
// ────────────────────────────────────────────────────────────────────────────

export const editClubMessage = (
  serverId: ClubServerId | number | string,
  messageId: string,
  content: string
) =>
  apiClient<{ message: DiscussionMessage }>(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages/${encodeURIComponent(
      messageId
    )}`,
    { method: 'PATCH', body: JSON.stringify({ content }) }
  );

export const deleteClubMessage = (serverId: ClubServerId | number | string, messageId: string) =>
  apiClient(
    `/discussions/groups/${encodeURIComponent(String(serverId))}/messages/${encodeURIComponent(
      messageId
    )}`,
    { method: 'DELETE' }
  );

export function useEditClubMessage(serverId?: ClubServerId | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { messageId: string; content: string }) =>
      editClubMessage(serverId as ClubServerId, args.messageId, args.content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubFeedKey(serverId ?? '') });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save changes'),
  });
}

export function useDeleteClubMessage(serverId?: ClubServerId | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteClubMessage(serverId as ClubServerId, messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubFeedKey(serverId ?? '') });
      toast.success('Post deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete post'),
  });
}

export function usePostClubComment(serverId?: ClubServerId | number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { messageId: string; content: string }) =>
      postClubComment(serverId as ClubServerId, args.messageId, args.content),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: clubCommentsKey(serverId ?? '', variables.messageId) });
      // Refreshes the post's threadPreview.replyCount shown in the collapsed state.
      qc.invalidateQueries({ queryKey: clubFeedKey(serverId ?? '') });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to comment'),
  });
}

