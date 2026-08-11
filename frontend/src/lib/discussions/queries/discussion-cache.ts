import { getQueryData, setQueryData } from '@/lib/async-query';
import type { QueryKey } from '@/lib/async-query';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import type {
  ChannelMessagesResponse,
  DiscussionMessage,
  GroupDmMessagesResponse,
  MessageReaction
} from '@/lib/discussions/queries/types';

export const discussionCache = {
  /** Replace or insert a message into a channel's first-page cache. */
  upsertChannelMessage(channelId: string, message: DiscussionMessage) {
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

  removeChannelMessage(channelId: string, messageId: string) {
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

  setReactions(messageId: string, reactions: MessageReaction[]) {
    cacheSet(discussionKeys.reactions(messageId), { reactions });
  },

  upsertGroupDmMessage(groupDmId: string, message: DiscussionMessage) {
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
