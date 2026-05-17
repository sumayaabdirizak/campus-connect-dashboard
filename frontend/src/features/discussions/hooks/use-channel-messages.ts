/**
 * Stateful, paginated, socket-merged message list for one channel.
 *
 *   const { messages, isLoading, hasMore, loadOlder, error } =
 *     useChannelMessages(channelId);
 *
 * Owns:
 *   - cursor-paginated history (loadOlder() prepends older messages)
 *   - live socket merge (message:new / edit / delete on channel:<id>)
 *   - dedupe by id
 *   - filters out thread replies (parentMessageId != null) so the main list
 *     only ever shows root messages
 *
 * Threads have their own hook (added in a later phase).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listChannelMessages } from '../api/service';
import { getDiscussionSocket } from '../api/socket';
import { useChannelRoom } from './use-discussion-room';
import { useReconnectGeneration } from './use-reconnect-generation';
import type { DiscussionMessage, MessageReaction } from '../api/types';

const DEFAULT_LIMIT = 50;

type State = {
  messages: DiscussionMessage[];
  nextCursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingOlder: boolean;
  error: Error | null;
};

const INITIAL_STATE: State = {
  messages: [],
  nextCursor: null,
  hasMore: false,
  isLoading: false,
  isLoadingOlder: false,
  error: null
};

function compareByCreatedAt(a: DiscussionMessage, b: DiscussionMessage): number {
  const at = new Date(a.createdAt).getTime();
  const bt = new Date(b.createdAt).getTime();
  if (at !== bt) return at - bt;
  return a.id - b.id;
}

function isMainThreadMessage(m: DiscussionMessage): boolean {
  return m.parentMessageId == null;
}

function mergeMessages(
  existing: DiscussionMessage[],
  incoming: DiscussionMessage[]
): DiscussionMessage[] {
  if (incoming.length === 0) return existing;
  const byId = new Map<number, DiscussionMessage>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) {
    const prev = byId.get(m.id);
    byId.set(m.id, prev ? { ...prev, ...m } : m);
  }
  return Array.from(byId.values()).toSorted(compareByCreatedAt);
}

export function useChannelMessages(
  channelId: number | null | undefined,
  options: { limit?: number } = {}
) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const validId =
    Number.isFinite(Number(channelId)) && Number(channelId) > 0 ? Number(channelId) : null;

  // Keep socket joined while this hook is mounted.
  useChannelRoom(validId);
  // Refetch the initial page whenever the socket reconnects so we don't
  // silently miss messages that arrived during a network blip.
  const reconnectGen = useReconnectGeneration();

  const [state, setState] = useState<State>(INITIAL_STATE);
  const requestSeqRef = useRef(0);

  // ── Initial load (and reload on channelId change OR socket reconnect) ──
  useEffect(() => {
    if (validId == null) {
      setState(INITIAL_STATE);
      return;
    }
    const seq = ++requestSeqRef.current;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    let cancelled = false;
    void (async () => {
      try {
        const page = await listChannelMessages(validId, { limit });
        if (cancelled || requestSeqRef.current !== seq) return;
        const main = (page.results ?? []).filter(isMainThreadMessage);
        setState({
          messages: main.toSorted(compareByCreatedAt),
          nextCursor: page.nextCursor ?? null,
          hasMore: Boolean(page.hasMore),
          isLoading: false,
          isLoadingOlder: false,
          error: null
        });
      } catch (e) {
        if (cancelled || requestSeqRef.current !== seq) return;
        setState({
          ...INITIAL_STATE,
          error: e instanceof Error ? e : new Error(String(e))
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [validId, limit, reconnectGen]);

  // ── Socket merge ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (validId == null) return;
    const socket = getDiscussionSocket();

    const onNew = (raw: unknown) => {
      const msg = unwrap(raw);
      if (!msg || Number(msg.channelId) !== validId) return;
      if (isMainThreadMessage(msg)) {
        setState((s) => ({ ...s, messages: mergeMessages(s.messages, [msg]) }));
        return;
      }
      // It's a thread reply — bump the parent's preview so the count
      // and last-reply time update live in the main list.
      const parentId = Number(msg.parentMessageId);
      if (!Number.isFinite(parentId)) return;
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === parentId);
        if (idx < 0) return s;
        const next = s.messages.slice();
        const parent = next[idx];
        const prevPreview = parent.threadPreview ?? {
          replyCount: 0,
          lastReplyAt: null,
          previewSenders: []
        };
        const senderEntry = msg.isAnonymous
          ? { id: 0, full_name: 'Anonymous' }
          : msg.sender ?? null;
        const senders = senderEntry
          ? [
              senderEntry,
              ...prevPreview.previewSenders.filter(
                (p) => p.id !== senderEntry.id || p.full_name !== senderEntry.full_name
              )
            ].slice(0, 3)
          : prevPreview.previewSenders;
        next[idx] = {
          ...parent,
          threadPreview: {
            replyCount: prevPreview.replyCount + 1,
            lastReplyAt: msg.createdAt,
            previewSenders: senders
          }
        };
        return { ...s, messages: next };
      });
    };
    const onEdit = (raw: unknown) => {
      const msg = unwrap(raw);
      if (!msg || Number(msg.channelId) !== validId) return;
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === msg.id);
        if (idx < 0) return s;
        const next = s.messages.slice();
        next[idx] = { ...next[idx], ...msg };
        return { ...s, messages: next };
      });
    };
    const onDelete = (payload: { messageId?: number; channelId?: number }) => {
      const messageId = Number(payload?.messageId);
      if (!Number.isFinite(messageId)) return;
      if (payload?.channelId != null && Number(payload.channelId) !== validId) return;
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId);
        if (idx < 0) return s;
        const next = s.messages.slice();
        next[idx] = { ...next[idx], deletedAt: new Date().toISOString() };
        return { ...s, messages: next };
      });
    };

    const onReaction = (payload: {
      messageId?: number;
      reactions?: MessageReaction[];
    }) => {
      const messageId = Number(payload?.messageId);
      if (!Number.isFinite(messageId)) return;
      if (!Array.isArray(payload?.reactions)) return;
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId);
        if (idx < 0) return s;
        const next = s.messages.slice();
        next[idx] = { ...next[idx], reactions: payload.reactions };
        return { ...s, messages: next };
      });
    };

    socket.on('message:new', onNew);
    socket.on('discussion:message:new', onNew);
    socket.on('message:edit', onEdit);
    socket.on('message:edited', onEdit);
    socket.on('message:delete', onDelete);
    socket.on('message:deleted', onDelete);
    socket.on('reaction:update', onReaction);

    return () => {
      socket.off('message:new', onNew);
      socket.off('discussion:message:new', onNew);
      socket.off('message:edit', onEdit);
      socket.off('message:edited', onEdit);
      socket.off('message:delete', onDelete);
      socket.off('message:deleted', onDelete);
      socket.off('reaction:update', onReaction);
    };
  }, [validId]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const loadOlder = useCallback(async () => {
    if (validId == null) return;
    let started = false;
    setState((s) => {
      if (s.isLoadingOlder || !s.hasMore || !s.nextCursor) return s;
      started = true;
      return { ...s, isLoadingOlder: true };
    });
    if (!started) return;

    const seq = requestSeqRef.current;
    try {
      const cursor = stateRefRead().nextCursor;
      const page = await listChannelMessages(validId, { limit, cursor });
      if (requestSeqRef.current !== seq) return;
      const older = (page.results ?? []).filter(isMainThreadMessage);
      setState((s) => ({
        ...s,
        messages: mergeMessages(s.messages, older),
        nextCursor: page.nextCursor ?? null,
        hasMore: Boolean(page.hasMore),
        isLoadingOlder: false,
        error: null
      }));
    } catch (e) {
      if (requestSeqRef.current !== seq) return;
      setState((s) => ({
        ...s,
        isLoadingOlder: false,
        error: e instanceof Error ? e : new Error(String(e))
      }));
    }
  }, [validId, limit]);

  // We need synchronous read of the latest state for the cursor inside
  // loadOlder; React's setState callback can't return a value, so keep a ref.
  const stateRef = useRef(state);
  stateRef.current = state;
  function stateRefRead(): State {
    return stateRef.current;
  }

  // ── Optimistic mutation API ─────────────────────────────────────────────
  // The composer calls these in order: addOptimisticMessage on submit,
  // then replaceOptimisticMessage on mutation success (server returned the
  // real row), or removeOptimisticMessage on failure. Temp messages use
  // negative ids — auto-increment ids are always positive, so there's no
  // collision risk with real messages or with later socket echoes.
  const addOptimisticMessage = useCallback((temp: DiscussionMessage) => {
    setState((s) => ({ ...s, messages: mergeMessages(s.messages, [temp]) }));
  }, []);

  const replaceOptimisticMessage = useCallback(
    (tempId: number, real: DiscussionMessage) => {
      setState((s) => {
        const filtered = s.messages.filter((m) => m.id !== tempId);
        return { ...s, messages: mergeMessages(filtered, [real]) };
      });
    },
    []
  );

  const removeOptimisticMessage = useCallback((tempId: number) => {
    setState((s) => ({
      ...s,
      messages: s.messages.filter((m) => m.id !== tempId)
    }));
  }, []);

  /**
   * Patch a message in local state and return a function that reverts the
   * patch. Used by edit/delete flows to update the UI before the network
   * call completes; the returned thunk runs in the mutation's onError to
   * roll back if the server rejects.
   *
   * The snapshot captures only the keys actually being patched, so reverting
   * is a precise restore (won't clobber concurrent socket updates to other
   * fields).
   */
  const optimisticPatchMessage = useCallback(
    (messageId: number, patch: Partial<DiscussionMessage>): (() => void) => {
      let snapshot: Partial<DiscussionMessage> | null = null;
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId);
        if (idx < 0) return s;
        const msg = s.messages[idx];
        const snap: Partial<DiscussionMessage> = {};
        for (const k of Object.keys(patch) as (keyof DiscussionMessage)[]) {
          (snap as Record<string, unknown>)[k as string] = (msg as Record<
            string,
            unknown
          >)[k as string];
        }
        snapshot = snap;
        const next = s.messages.slice();
        next[idx] = { ...msg, ...patch };
        return { ...s, messages: next };
      });
      return () => {
        if (!snapshot) return;
        setState((s) => {
          const idx = s.messages.findIndex((x) => x.id === messageId);
          if (idx < 0) return s;
          const next = s.messages.slice();
          next[idx] = {
            ...next[idx],
            ...(snapshot as Partial<DiscussionMessage>)
          };
          return { ...s, messages: next };
        });
      };
    },
    []
  );

  /**
   * Toggle a reaction in local state instantly. Returns whether the click
   * results in adding (true) or removing (false), so the caller can pick the
   * right mutation. Applying the same call twice reverses itself — this is
   * the rollback path on error.
   *
   * The reaction.id is negative for optimistic rows so the next
   * `reaction:update` socket event (which replaces the whole reactions
   * array) cleanly displaces it without manual cleanup.
   */
  const optimisticToggleReaction = useCallback(
    (
      messageId: number,
      emoji: string,
      myUserId: number,
      myDisplayName: string
    ): { wasAdding: boolean } => {
      let wasAdding = false;
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === messageId);
        if (idx < 0) return s;
        const msg = s.messages[idx];
        const reactions = msg.reactions ?? [];
        const mineIdx = reactions.findIndex(
          (r) => Number(r.userId) === myUserId && r.emoji === emoji
        );
        const nextReactions: MessageReaction[] =
          mineIdx >= 0
            ? reactions.filter((_, i) => i !== mineIdx)
            : [
                ...reactions,
                {
                  id: -Date.now(),
                  messageId,
                  userId: myUserId,
                  emoji,
                  createdAt: new Date().toISOString(),
                  user: { id: myUserId, full_name: myDisplayName }
                }
              ];
        wasAdding = mineIdx < 0;
        const next = s.messages.slice();
        next[idx] = { ...msg, reactions: nextReactions };
        return { ...s, messages: next };
      });
      return { wasAdding };
    },
    []
  );

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isLoadingOlder: state.isLoadingOlder,
    hasMore: state.hasMore,
    nextCursor: state.nextCursor,
    error: state.error,
    loadOlder,
    addOptimisticMessage,
    replaceOptimisticMessage,
    removeOptimisticMessage,
    optimisticToggleReaction,
    optimisticPatchMessage
  };
}

export type ChannelMessagesStore = ReturnType<typeof useChannelMessages>;

function unwrap(raw: unknown): DiscussionMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { message?: DiscussionMessage; id?: number };
  if (obj.message && typeof obj.message === 'object') return obj.message;
  if (typeof obj.id === 'number') return raw as DiscussionMessage;
  return null;
}
