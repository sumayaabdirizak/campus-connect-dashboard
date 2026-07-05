/**
 * Singleton socket.io client for the Discussions module.
 *
 * Owns:
 *   - one shared socket connection (lazy, refcounted)
 *   - room join/leave with refcount so multiple components can subscribe to
 *     the same channel without stomping each other
 *   - automatic cache patching for backend events:
 *       message:new        → discussionCache.upsertChannelMessage / GroupDm
 *       message:edit       → upsertChannelMessage with editedAt
 *       message:edited     → ditto (legacy event name)
 *       message:delete     → removeChannelMessage
 *       message:deleted    → ditto (legacy event name)
 *       reaction:update    → setReactions
 *       channel:update     → invalidate channel detail (or server list when `deleted`)
 *       server:channelsChanged → invalidate server detail (move/reorder)
 *       channel:pins:update → invalidate channel pins
 *       unread:update      → invalidate unread count
 *       groupdm:new        → invalidate group dm list
 *       groupdm:message:new → upsertGroupDmMessage
 *
 * Components consume this via the `useDiscussionRooms` hook from
 * features/discussions/hooks/use-discussion-socket.ts (added in Phase 1.5).
 */

'use client';

import { io, type Socket } from 'socket.io-client';
import { getQueryData, invalidateQueries, setQueryData } from '@/lib/async-query';
import { discussionCache, discussionKeys } from './queries';
import type {
  DiscussionMessage,
  MessageReaction,
  PresenceState,
  ServerPresenceResponse,
  UnreadSocketPayload
} from './types';

import { getSocketUrl } from '@/lib/api-config';

type RoomKey =
  | `channel:${number}`
  | `groupdm:${number}`
  | `user:${number}`
  | `discussion:${number}`;

let socket: Socket | null = null;
let listenersBound = false;
const roomRefCounts = new Map<RoomKey, number>();

/**
 * Increments every time the socket reconnects after the first connect. Hooks
 * that hold message lists in local state (useChannelMessages,
 * useGroupDmMessages, useThreadMessages) subscribe to this so they can
 * re-fetch the initial page after a network blip — otherwise a 30-second
 * disconnection silently drops every message the user missed.
 */
let reconnectGeneration = 0;
let hasConnectedOnce = false;
const reconnectListeners = new Set<(gen: number) => void>();

export function getReconnectGeneration(): number {
  return reconnectGeneration;
}

export function subscribeReconnect(listener: (gen: number) => void): () => void {
  reconnectListeners.add(listener);
  return () => {
    reconnectListeners.delete(listener);
  };
}

function bumpReconnectGeneration() {
  reconnectGeneration += 1;
  for (const fn of reconnectListeners) fn(reconnectGeneration);
}

function ensureSocket(): Socket {
  if (socket) return socket;
  socket = io(getSocketUrl(), {
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true
  });
  bindGlobalListeners(socket);
  return socket;
}

/** Re-emits room joins after a reconnect. */
function rejoinAllRooms() {
  const s = socket;
  if (!s) return;
  for (const [room, count] of roomRefCounts) {
    if (count <= 0) continue;
    if (room.startsWith('channel:')) {
      const channelId = Number(room.split(':')[1]);
      s.emit('channel:join', { channelId }, () => undefined);
    } else if (room.startsWith('groupdm:')) {
      const groupDmId = Number(room.split(':')[1]);
      s.emit('groupdm:join', { groupDmId }, () => undefined);
    } else if (room.startsWith('discussion:')) {
      const groupId = Number(room.split(':')[1]);
      s.emit(
        'join:group',
        { groupId, deviceId: 'web-default', fromVersion: 0 },
        () => undefined
      );
    }
  }
}

function unwrapMessage(raw: unknown): DiscussionMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { message?: DiscussionMessage; id?: number };
  if (obj.message && typeof obj.message === 'object') return obj.message;
  if (typeof obj.id === 'number') return raw as DiscussionMessage;
  return null;
}

function bindGlobalListeners(s: Socket) {
  if (listenersBound) return;
  listenersBound = true;

  s.on('connect', () => {
    rejoinAllRooms();
    if (hasConnectedOnce) {
      // True reconnect — wake hooks so they re-fetch what they missed.
      bumpReconnectGeneration();
      // Refresh server-detail / unread / notification queries that live in
      // the async-query cache.
      invalidateQueries({ queryKey: discussionKeys.unreadCount() });
      invalidateQueries({ queryKey: [...discussionKeys.all, 'notifications'] });
    }
    hasConnectedOnce = true;
  });

  // ── Channel/server messages ──────────────────────────────────────────────
  const onMessageNew = (raw: unknown) => {
    const msg = unwrapMessage(raw);
    if (!msg) return;
    if (msg.channelId) {
      discussionCache.upsertChannelMessage(Number(msg.channelId), msg);
    }
    if (msg.groupDmId) {
      discussionCache.upsertGroupDmMessage(Number(msg.groupDmId), msg);
    }
  };
  s.on('message:new', onMessageNew);
  s.on('discussion:message:new', onMessageNew);
  s.on('groupdm:message:new', onMessageNew);

  const onMessageEdit = (raw: unknown) => {
    const msg = unwrapMessage(raw);
    if (!msg) return;
    if (msg.channelId) discussionCache.upsertChannelMessage(Number(msg.channelId), msg);
    if (msg.groupDmId) discussionCache.upsertGroupDmMessage(Number(msg.groupDmId), msg);
  };
  s.on('message:edit', onMessageEdit);
  s.on('message:edited', onMessageEdit);

  const onMessageDelete = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const obj = raw as { messageId?: number; channelId?: number; groupDmId?: number };
    const messageId = Number(obj.messageId);
    if (!Number.isFinite(messageId)) return;
    if (obj.channelId) discussionCache.removeChannelMessage(Number(obj.channelId), messageId);
  };
  s.on('message:delete', onMessageDelete);
  s.on('message:deleted', onMessageDelete);

  // ── Reactions ────────────────────────────────────────────────────────────
  s.on(
    'reaction:update',
    (payload: { messageId?: number; reactions?: MessageReaction[] }) => {
      const messageId = Number(payload?.messageId);
      if (!Number.isFinite(messageId)) return;
      if (Array.isArray(payload?.reactions)) {
        discussionCache.setReactions(messageId, payload.reactions);
      } else {
        invalidateQueries({ queryKey: discussionKeys.reactions(messageId) });
      }
    }
  );

  // ── Channel metadata ─────────────────────────────────────────────────────
  s.on(
    'channel:update',
    (payload: {
      channelId?: number;
      serverId?: number;
      deleted?: boolean;
      overwrite?: unknown;
      overwriteRemoved?: unknown;
    }) => {
      const channelId = Number(payload?.channelId);
      if (!Number.isFinite(channelId)) return;
      if (payload?.deleted) {
        invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
        const serverId = Number(payload?.serverId);
        if (Number.isFinite(serverId) && serverId > 0) {
          invalidateQueries({ queryKey: discussionKeys.server(serverId) });
          invalidateQueries({
            queryKey: discussionKeys.serverChannels(serverId)
          });
        } else {
          invalidateQueries({ queryKey: discussionKeys.all });
        }
        return;
      }
      invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      // The same event also fires after PUT/DELETE on
      // `/channels/:id/overwrites/*`. Refresh the overwrites list so the
      // Permissions tab reflects writes made from other tabs/clients.
      if (payload?.overwrite || payload?.overwriteRemoved) {
        invalidateQueries({
          queryKey: discussionKeys.channelOverwrites(channelId)
        });
      }
    }
  );

  // Fired when a category/position change reshuffles a server's channel list
  // (PATCH /channels/:id with categoryId or position). Refresh the server
  // detail so the sidebar relocates the channel without a manual reload.
  s.on(
    'server:channelsChanged',
    (payload: { serverId?: number }) => {
      const serverId = Number(payload?.serverId);
      if (!Number.isFinite(serverId) || serverId <= 0) return;
      invalidateQueries({ queryKey: discussionKeys.server(serverId) });
      invalidateQueries({
        queryKey: discussionKeys.serverChannels(serverId)
      });
    }
  );

  s.on('channel:pins:update', (payload: { channelId?: number }) => {
    const channelId = Number(payload?.channelId);
    if (!Number.isFinite(channelId)) return;
    invalidateQueries({ queryKey: discussionKeys.channelPins(channelId) });
  });

  // ── Unread + notifications ───────────────────────────────────────────────
  s.on('unread:update', (payload: UnreadSocketPayload) => {
    if (payload && typeof payload === 'object' && Array.isArray(payload.byGroup)) {
      setQueryData<UnreadSocketPayload>(discussionKeys.unreadSummary(), payload);
      setQueryData(discussionKeys.unreadCount(), {
        unreadCount: Number(payload.globalUnread ?? 0)
      });
    } else {
      invalidateQueries({ queryKey: discussionKeys.unreadCount() });
    }
  });
  s.on('notification:new', () => {
    invalidateQueries({ queryKey: discussionKeys.unreadCount() });
    invalidateQueries({ queryKey: [...discussionKeys.all, 'notifications'] });
  });

  // ── Group DMs ────────────────────────────────────────────────────────────
  s.on('groupdm:new', () => {
    invalidateQueries({ queryKey: discussionKeys.groupDms() });
  });

  // ── Presence ─────────────────────────────────────────────────────────────
  // Backend broadcasts presence:update to discussionRoom(groupId) (i.e. the
  // legacy server-wide room). We join that room when subscribing to a
  // `discussion:<id>` RoomKey. Patch the per-server presence cache in place
  // so the dot updates without waiting for the 30s poll.
  s.on(
    'presence:update',
    (payload: {
      groupId?: number;
      userId?: number;
      state?: PresenceState;
      lastSeenAt?: string;
    }) => {
      const groupId = Number(payload?.groupId);
      const userId = Number(payload?.userId);
      if (!Number.isFinite(groupId) || !Number.isFinite(userId)) return;
      if (!payload.state) return;
      const key = discussionKeys.serverPresence(groupId);
      const prev = getQueryData<ServerPresenceResponse>(key);
      if (!prev) return; // No subscribers yet — let the next fetch surface it.
      const idx = prev.results.findIndex((r) => Number(r.userId) === userId);
      const lastSeenAt = payload.lastSeenAt ?? new Date().toISOString();
      let nextResults;
      if (idx >= 0) {
        nextResults = prev.results.slice();
        nextResults[idx] = {
          ...nextResults[idx],
          presence: payload.state,
          lastSeenAt,
          sessionConnected: payload.state !== 'offline'
        };
      } else {
        // User wasn't in the membership snapshot — skip; the next refetch
        // will pick them up if they're a real member.
        return;
      }
      setQueryData<ServerPresenceResponse>(key, {
        ...prev,
        results: nextResults
      });
    }
  );
  s.on('groupdm:member:add', (payload: { groupDmId?: number }) => {
    const groupDmId = Number(payload?.groupDmId);
    if (!Number.isFinite(groupDmId)) return;
    invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
  });
  s.on('groupdm:member:remove', (payload: { groupDmId?: number }) => {
    const groupDmId = Number(payload?.groupDmId);
    if (!Number.isFinite(groupDmId)) return;
    invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
    invalidateQueries({ queryKey: discussionKeys.groupDms() });
  });
  // B2: a member (possibly the caller themselves on another device) has left
  // the DM. Same cache refresh as a moderator-driven remove — the detail and
  // list views re-pull and the now-archived DM (if any) drops out.
  s.on('groupdm:member:leave', (payload: { groupDmId?: number }) => {
    const groupDmId = Number(payload?.groupDmId);
    if (!Number.isFinite(groupDmId)) return;
    invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
    invalidateQueries({ queryKey: discussionKeys.groupDms() });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

export function getDiscussionSocket(): Socket {
  return ensureSocket();
}

/** Increment the refcount for a room and emit the join on first subscriber. */
export function joinRoom(room: RoomKey): void {
  const s = ensureSocket();
  const next = (roomRefCounts.get(room) ?? 0) + 1;
  roomRefCounts.set(room, next);
  if (next !== 1) return;
  if (room.startsWith('channel:')) {
    const channelId = Number(room.split(':')[1]);
    s.emit('channel:join', { channelId }, () => undefined);
  } else if (room.startsWith('groupdm:')) {
    const groupDmId = Number(room.split(':')[1]);
    s.emit('groupdm:join', { groupDmId }, () => undefined);
  } else if (room.startsWith('discussion:')) {
    // Server-wide room — used to receive `presence:update` events for all
    // members in this server. Backend handler is the legacy `join:group`.
    const groupId = Number(room.split(':')[1]);
    s.emit(
      'join:group',
      { groupId, deviceId: 'web-default', fromVersion: 0 },
      () => undefined
    );
  }
}

/** Decrement the refcount for a room and emit the leave when it hits zero. */
export function leaveRoom(room: RoomKey): void {
  const s = socket;
  const next = (roomRefCounts.get(room) ?? 0) - 1;
  if (next <= 0) {
    roomRefCounts.delete(room);
    if (s) {
      if (room.startsWith('channel:')) {
        const channelId = Number(room.split(':')[1]);
        s.emit('channel:leave', { channelId });
      } else if (room.startsWith('groupdm:')) {
        const groupDmId = Number(room.split(':')[1]);
        s.emit('groupdm:leave', { groupDmId });
      } else if (room.startsWith('discussion:')) {
        const groupId = Number(room.split(':')[1]);
        s.emit('leave:group', { groupId });
      }
    }
    return;
  }
  roomRefCounts.set(room, next);
}

export function emitTypingStart(args: { channelId?: number; groupDmId?: number }) {
  const s = ensureSocket();
  if (args.channelId) s.emit('typing:start', { channelId: args.channelId }, () => undefined);
  if (args.groupDmId) s.emit('typing:start', { groupDmId: args.groupDmId }, () => undefined);
}

export function emitTypingStop(args: { channelId?: number; groupDmId?: number }) {
  const s = ensureSocket();
  if (args.channelId) s.emit('typing:stop', { channelId: args.channelId }, () => undefined);
  if (args.groupDmId) s.emit('typing:stop', { groupDmId: args.groupDmId }, () => undefined);
}

/** Tell the server "I've read up to this message". Backend creates a
 *  DiscussionReadReceipt and broadcasts message:read:update to the room. */
export function emitMessageRead(args: {
  channelId?: number;
  groupDmId?: number;
  messageId: number;
}) {
  const s = ensureSocket();
  const { channelId, groupDmId, messageId } = args;
  if (channelId) {
    s.emit('message:read', { channelId, messageId }, () => undefined);
  } else if (groupDmId) {
    s.emit('message:read', { groupDmId, messageId }, () => undefined);
  }
}

export type { Socket };
export type { RoomKey };
