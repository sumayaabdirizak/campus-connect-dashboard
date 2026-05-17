/**
 * Stateful, paginated, socket-merged message list for one group DM.
 *
 * Mirrors useChannelMessages but for DMs: joins the `groupdm:<id>` socket
 * room, listens for `message:new`, `message:edit`, `message:delete`, and
 * `reaction:update` events scoped to that DM, and exposes a flat
 * chronological list with cursor-based "load older" pagination.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listGroupDmMessages } from '../api/service';
import { getDiscussionSocket } from '../api/socket';
import { useGroupDmRoom } from './use-discussion-room';
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

function unwrap(raw: unknown): DiscussionMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { message?: DiscussionMessage; id?: number };
  if (obj.message && typeof obj.message === 'object') return obj.message;
  if (typeof obj.id === 'number') return raw as DiscussionMessage;
  return null;
}

export function useGroupDmMessages(
  groupDmId: number | null | undefined,
  options: { limit?: number } = {}
) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const validId =
    Number.isFinite(Number(groupDmId)) && Number(groupDmId) > 0 ? Number(groupDmId) : null;

  useGroupDmRoom(validId);
  const reconnectGen = useReconnectGeneration();

  const [state, setState] = useState<State>(INITIAL_STATE);
  const requestSeqRef = useRef(0);

  // ── Initial load (re-runs on reconnect to catch up on missed messages) ──
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
        const page = await listGroupDmMessages(validId, { limit });
        if (cancelled || requestSeqRef.current !== seq) return;
        setState({
          messages: (page.results ?? []).toSorted(compareByCreatedAt),
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
      if (!msg || Number(msg.groupDmId) !== validId) return;
      setState((s) => ({ ...s, messages: mergeMessages(s.messages, [msg]) }));
    };
    const onEdit = (raw: unknown) => {
      const msg = unwrap(raw);
      if (!msg || Number(msg.groupDmId) !== validId) return;
      setState((s) => {
        const idx = s.messages.findIndex((x) => x.id === msg.id);
        if (idx < 0) return s;
        const next = s.messages.slice();
        next[idx] = { ...next[idx], ...msg };
        return { ...s, messages: next };
      });
    };
    const onDelete = (payload: { messageId?: number; groupDmId?: number }) => {
      const messageId = Number(payload?.messageId);
      if (!Number.isFinite(messageId)) return;
      if (payload?.groupDmId != null && Number(payload.groupDmId) !== validId) return;
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
    socket.on('groupdm:message:new', onNew);
    socket.on('message:edit', onEdit);
    socket.on('message:edited', onEdit);
    socket.on('message:delete', onDelete);
    socket.on('message:deleted', onDelete);
    socket.on('reaction:update', onReaction);

    return () => {
      socket.off('message:new', onNew);
      socket.off('groupdm:message:new', onNew);
      socket.off('message:edit', onEdit);
      socket.off('message:edited', onEdit);
      socket.off('message:delete', onDelete);
      socket.off('message:deleted', onDelete);
      socket.off('reaction:update', onReaction);
    };
  }, [validId]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const stateRef = useRef(state);
  stateRef.current = state;

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
      const cursor = stateRef.current.nextCursor;
      const page = await listGroupDmMessages(validId, { limit, cursor });
      if (requestSeqRef.current !== seq) return;
      setState((s) => ({
        ...s,
        messages: mergeMessages(s.messages, page.results ?? []),
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

  // ── Optimistic message API ──────────────────────────────────────────────
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

  /** Toggle a reaction in local state instantly. Returns whether this click
   *  is an add (true) or remove (false) so the caller picks the right
   *  mutation. Calling twice with the same args reverts — the rollback
   *  path on error. */
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

  /** Patch a DM message in local state and return a function that reverts.
   *  Used by edit/delete flows — same shape as the channel-messages hook. */
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

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isLoadingOlder: state.isLoadingOlder,
    hasMore: state.hasMore,
    error: state.error,
    loadOlder,
    addOptimisticMessage,
    replaceOptimisticMessage,
    removeOptimisticMessage,
    optimisticPatchMessage,
    optimisticToggleReaction
  };
}

export type GroupDmMessagesStore = ReturnType<typeof useGroupDmMessages>;
