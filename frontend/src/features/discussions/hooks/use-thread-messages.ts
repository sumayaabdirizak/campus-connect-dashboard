/**
 * Stateful thread view: root message + chronological replies.
 *
 *   const { root, replies, isLoading, hasMore, loadOlder } =
 *     useThreadMessages(channelId, threadRootId);
 *
 * Mirrors useChannelMessages but for one thread (parentMessageId === root).
 * Lives off the same channel:<id> socket room — assumes the parent component
 * already joined the room (via useChannelMessages or useChannelRoom).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listChannelMessages } from '../api/service';
import { getDiscussionSocket } from '../api/socket';
import { useReconnectGeneration } from './use-reconnect-generation';
import type { DiscussionMessage, MessageReaction } from '../api/types';

const DEFAULT_LIMIT = 50;

type State = {
  root: DiscussionMessage | null;
  replies: DiscussionMessage[];
  nextCursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingOlder: boolean;
  error: Error | null;
};

const INITIAL_STATE: State = {
  root: null,
  replies: [],
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

function mergeReplies(
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

function unwrap(raw: unknown): DiscussionMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { message?: DiscussionMessage; id?: number };
  if (obj.message && typeof obj.message === 'object') return obj.message;
  if (typeof obj.id === 'number') return raw as DiscussionMessage;
  return null;
}

export function useThreadMessages(
  channelId: number | null | undefined,
  threadRootId: number | null | undefined,
  options: { limit?: number } = {}
) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const validChannelId =
    Number.isFinite(Number(channelId)) && Number(channelId) > 0 ? Number(channelId) : null;
  const validRootId =
    Number.isFinite(Number(threadRootId)) && Number(threadRootId) > 0
      ? Number(threadRootId)
      : null;

  const [state, setState] = useState<State>(INITIAL_STATE);
  const requestSeqRef = useRef(0);
  const reconnectGen = useReconnectGeneration();

  // ── Initial load (re-runs on reconnect) ─────────────────────────────────
  useEffect(() => {
    if (validChannelId == null || validRootId == null) {
      setState(INITIAL_STATE);
      return;
    }
    const seq = ++requestSeqRef.current;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    let cancelled = false;
    void (async () => {
      try {
        const page = await listChannelMessages(validChannelId, {
          limit,
          threadRoot: validRootId
        });
        if (cancelled || requestSeqRef.current !== seq) return;
        const all = page.results ?? [];
        const root = all.find((m) => m.id === validRootId) ?? null;
        const replies = all
          .filter((m) => m.id !== validRootId && m.parentMessageId === validRootId)
          .toSorted(compareByCreatedAt);
        setState({
          root,
          replies,
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
  }, [validChannelId, validRootId, limit, reconnectGen]);

  // ── Socket merge — replies arrive on the same channel:<id> room ─────────
  useEffect(() => {
    if (validChannelId == null || validRootId == null) return;
    const socket = getDiscussionSocket();

    const onNew = (raw: unknown) => {
      const msg = unwrap(raw);
      if (!msg || Number(msg.channelId) !== validChannelId) return;
      if (Number(msg.parentMessageId) !== validRootId) return;
      setState((s) => ({ ...s, replies: mergeReplies(s.replies, [msg]) }));
    };
    const onEdit = (raw: unknown) => {
      const msg = unwrap(raw);
      if (!msg) return;
      setState((s) => {
        if (msg.id === validRootId) {
          return { ...s, root: s.root ? { ...s.root, ...msg } : msg };
        }
        const idx = s.replies.findIndex((x) => x.id === msg.id);
        if (idx < 0) return s;
        const next = s.replies.slice();
        next[idx] = { ...next[idx], ...msg };
        return { ...s, replies: next };
      });
    };
    const onDelete = (payload: { messageId?: number }) => {
      const messageId = Number(payload?.messageId);
      if (!Number.isFinite(messageId)) return;
      setState((s) => {
        if (messageId === validRootId && s.root) {
          return { ...s, root: { ...s.root, deletedAt: new Date().toISOString() } };
        }
        const idx = s.replies.findIndex((x) => x.id === messageId);
        if (idx < 0) return s;
        const next = s.replies.slice();
        next[idx] = { ...next[idx], deletedAt: new Date().toISOString() };
        return { ...s, replies: next };
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
        if (messageId === validRootId && s.root) {
          return { ...s, root: { ...s.root, reactions: payload.reactions } };
        }
        const idx = s.replies.findIndex((x) => x.id === messageId);
        if (idx < 0) return s;
        const next = s.replies.slice();
        next[idx] = { ...next[idx], reactions: payload.reactions };
        return { ...s, replies: next };
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
  }, [validChannelId, validRootId]);

  // ── Pagination — older replies (cursor) ──────────────────────────────────
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadOlder = useCallback(async () => {
    if (validChannelId == null || validRootId == null) return;
    let started = false;
    setState((s) => {
      if (s.isLoadingOlder || !s.hasMore || !s.nextCursor) return s;
      started = true;
      return { ...s, isLoadingOlder: true };
    });
    if (!started) return;

    const seq = requestSeqRef.current;
    try {
      const cursor = stateRef.current.nextCursor;
      const page = await listChannelMessages(validChannelId, {
        limit,
        threadRoot: validRootId,
        cursor
      });
      if (requestSeqRef.current !== seq) return;
      const older = (page.results ?? []).filter(
        (m) => m.id !== validRootId && m.parentMessageId === validRootId
      );
      setState((s) => ({
        ...s,
        replies: mergeReplies(s.replies, older),
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
  }, [validChannelId, validRootId, limit]);

  // ── Optimistic reply API ─────────────────────────────────────────────────
  const addOptimisticReply = useCallback((temp: DiscussionMessage) => {
    setState((s) => ({ ...s, replies: mergeReplies(s.replies, [temp]) }));
  }, []);

  const replaceOptimisticReply = useCallback(
    (tempId: number, real: DiscussionMessage) => {
      setState((s) => {
        const filtered = s.replies.filter((m) => m.id !== tempId);
        return { ...s, replies: mergeReplies(filtered, [real]) };
      });
    },
    []
  );

  const removeOptimisticReply = useCallback((tempId: number) => {
    setState((s) => ({ ...s, replies: s.replies.filter((m) => m.id !== tempId) }));
  }, []);

  return {
    root: state.root,
    replies: state.replies,
    isLoading: state.isLoading,
    isLoadingOlder: state.isLoadingOlder,
    hasMore: state.hasMore,
    error: state.error,
    loadOlder,
    addOptimisticReply,
    replaceOptimisticReply,
    removeOptimisticReply
  };
}
