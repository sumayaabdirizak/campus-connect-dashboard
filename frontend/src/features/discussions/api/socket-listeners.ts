import type { Socket } from 'socket.io-client';
import { getQueryData, invalidateQueries, setQueryData } from '@/lib/async-query';
import { discussionCache, discussionKeys } from './queries';
import type {
  DiscussionMessage,
  MessageReaction,
  PresenceState,
  ServerPresenceResponse,
  UnreadSocketPayload,
} from './types';
import {
  bumpReconnectGeneration,
  getHasConnectedOnce,
  isListenersBound,
  setHasConnectedOnce,
  setListenersBound,
} from './socket-state';
import { rejoinAllRooms, unwrapMessage } from './socket-connection';

export function bindGlobalListeners(s: Socket) {
  if (isListenersBound()) return;
  setListenersBound(true);

  s.on('connect', () => {
    rejoinAllRooms();
    if (getHasConnectedOnce()) {
      bumpReconnectGeneration();
      invalidateQueries({ queryKey: discussionKeys.unreadCount() });
      invalidateQueries({ queryKey: [...discussionKeys.all, 'notifications'] });
    }
    setHasConnectedOnce(true);
  });

  bindMessageListeners(s);
  bindMetadataListeners(s);
  bindPresenceAndDmListeners(s);
}

function bindMessageListeners(s: Socket) {
  const onMessageNew = (raw: unknown) => {
    const msg = unwrapMessage(raw) as DiscussionMessage | null;
    if (!msg) return;
    if (msg.channelId) discussionCache.upsertChannelMessage(Number(msg.channelId), msg);
    if (msg.groupDmId) discussionCache.upsertGroupDmMessage(Number(msg.groupDmId), msg);
  };
  s.on('message:new', onMessageNew);
  s.on('discussion:message:new', onMessageNew);
  s.on('groupdm:message:new', onMessageNew);

  const onMessageEdit = (raw: unknown) => {
    const msg = unwrapMessage(raw) as DiscussionMessage | null;
    if (!msg) return;
    if (msg.channelId) discussionCache.upsertChannelMessage(Number(msg.channelId), msg);
    if (msg.groupDmId) discussionCache.upsertGroupDmMessage(Number(msg.groupDmId), msg);
  };
  s.on('message:edit', onMessageEdit);
  s.on('message:edited', onMessageEdit);

  const onMessageDelete = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const obj = raw as { messageId?: number; channelId?: number };
    const messageId = Number(obj.messageId);
    if (!Number.isFinite(messageId)) return;
    if (obj.channelId) discussionCache.removeChannelMessage(Number(obj.channelId), messageId);
  };
  s.on('message:delete', onMessageDelete);
  s.on('message:deleted', onMessageDelete);

  s.on('reaction:update', (payload: { messageId?: number; reactions?: MessageReaction[] }) => {
    const messageId = Number(payload?.messageId);
    if (!Number.isFinite(messageId)) return;
    if (Array.isArray(payload?.reactions)) {
      discussionCache.setReactions(messageId, payload.reactions);
    } else {
      invalidateQueries({ queryKey: discussionKeys.reactions(messageId) });
    }
  });
}

function bindMetadataListeners(s: Socket) {
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
          invalidateQueries({ queryKey: discussionKeys.serverChannels(serverId) });
        } else {
          invalidateQueries({ queryKey: discussionKeys.all });
        }
        return;
      }
      invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
      if (payload?.overwrite || payload?.overwriteRemoved) {
        invalidateQueries({ queryKey: discussionKeys.channelOverwrites(channelId) });
      }
    }
  );

  s.on('server:channelsChanged', (payload: { serverId?: number }) => {
    const serverId = Number(payload?.serverId);
    if (!Number.isFinite(serverId) || serverId <= 0) return;
    invalidateQueries({ queryKey: discussionKeys.server(serverId) });
    invalidateQueries({ queryKey: discussionKeys.serverChannels(serverId) });
  });

  s.on('channel:pins:update', (payload: { channelId?: number }) => {
    const channelId = Number(payload?.channelId);
    if (!Number.isFinite(channelId)) return;
    invalidateQueries({ queryKey: discussionKeys.channelPins(channelId) });
  });

  s.on('unread:update', (payload: UnreadSocketPayload) => {
    if (payload && typeof payload === 'object' && Array.isArray(payload.byGroup)) {
      setQueryData<UnreadSocketPayload>(discussionKeys.unreadSummary(), payload);
      setQueryData(discussionKeys.unreadCount(), {
        unreadCount: Number(payload.globalUnread ?? 0),
      });
    } else {
      invalidateQueries({ queryKey: discussionKeys.unreadCount() });
    }
  });

  s.on('notification:new', () => {
    invalidateQueries({ queryKey: discussionKeys.unreadCount() });
    invalidateQueries({ queryKey: [...discussionKeys.all, 'notifications'] });
  });

  s.on('groupdm:new', () => {
    invalidateQueries({ queryKey: discussionKeys.groupDms() });
  });
}

function bindPresenceAndDmListeners(s: Socket) {
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
      if (!Number.isFinite(groupId) || !Number.isFinite(userId) || !payload.state) return;
      const key = discussionKeys.serverPresence(groupId);
      const prev = getQueryData<ServerPresenceResponse>(key);
      if (!prev) return;
      const idx = prev.results.findIndex((r) => Number(r.userId) === userId);
      if (idx < 0) return;
      const lastSeenAt = payload.lastSeenAt ?? new Date().toISOString();
      const nextResults = prev.results.slice();
      nextResults[idx] = {
        ...nextResults[idx],
        presence: payload.state,
        lastSeenAt,
        sessionConnected: payload.state !== 'offline',
      };
      setQueryData<ServerPresenceResponse>(key, { ...prev, results: nextResults });
    }
  );

  const invalidateGroupDm = (payload: { groupDmId?: number }, alsoList = false) => {
    const groupDmId = Number(payload?.groupDmId);
    if (!Number.isFinite(groupDmId)) return;
    invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
    if (alsoList) invalidateQueries({ queryKey: discussionKeys.groupDms() });
  };

  s.on('groupdm:member:add', (p) => invalidateGroupDm(p));
  s.on('groupdm:member:remove', (p) => invalidateGroupDm(p, true));
  s.on('groupdm:member:leave', (p) => invalidateGroupDm(p, true));
}
