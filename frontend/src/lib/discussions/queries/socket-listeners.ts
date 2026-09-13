import type { Socket } from 'socket.io-client';
import { getQueryData, invalidateQueries, setQueryData } from '@/lib/async-query';
import { discussionCache, discussionKeys } from '@/lib/discussions/queries/queries';
import type {
  DiscussionMessage,
  MessageReaction,
  PresenceState,
  ServerPresenceResponse,
  UnreadSocketPayload,
} from '@/lib/discussions/queries/types';
import {
  bumpReconnectGeneration,
  getHasConnectedOnce,
  isListenersBound,
  setHasConnectedOnce,
  setListenersBound,
} from '@/lib/discussions/queries/socket-state';
import { rejoinAllRooms, unwrapMessage } from '@/lib/discussions/queries/socket-connection';
import { inboxKeys } from '@/lib/inbox/queries';
import { notificationKeys } from '@/lib/notifications/queries';
import { clubKeys } from '@/lib/clubs/queries';

export function bindGlobalListeners(s: Socket) {
  if (isListenersBound()) return;
  setListenersBound(true);

  s.on('connect', () => {
    rejoinAllRooms();
    if (getHasConnectedOnce()) {
      bumpReconnectGeneration();
      invalidateQueries({ queryKey: discussionKeys.unreadCount() });
      invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      invalidateQueries({ queryKey: notificationKeys.list() });
      invalidateQueries({ queryKey: inboxKeys.all });
      invalidateQueries({ queryKey: ['announcements'] });
      invalidateQueries({ queryKey: ['clubs'] });
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
    if (msg.channelId) discussionCache.upsertChannelMessage(msg.channelId, msg);
    if (msg.groupDmId) discussionCache.upsertGroupDmMessage(msg.groupDmId, msg);
    // Club feeds are keyed by DiscussionGroup id (`serverId` / `groupId`).
    const groupId = msg.groupId ?? msg.serverId;
    if (groupId && !msg.channelId && !msg.groupDmId) {
      invalidateQueries({ queryKey: ['clubs', 'feed', String(groupId)] });
      invalidateQueries({ queryKey: clubKeys.all });
    }
    // Keep Chats sidebar preview/order in sync without waiting for poll.
    if (msg.channelId || msg.groupDmId) {
      invalidateQueries({ queryKey: inboxKeys.all });
    }
  };
  s.on('message:new', onMessageNew);
  s.on('discussion:message:new', onMessageNew);
  s.on('groupdm:message:new', onMessageNew);

  const onMessageEdit = (raw: unknown) => {
    const msg = unwrapMessage(raw) as DiscussionMessage | null;
    if (!msg) return;
    if (msg.channelId) discussionCache.upsertChannelMessage(msg.channelId, msg);
    if (msg.groupDmId) discussionCache.upsertGroupDmMessage(msg.groupDmId, msg);
  };
  s.on('message:edit', onMessageEdit);
  s.on('message:edited', onMessageEdit);

  const onMessageDelete = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const obj = raw as { messageId?: string; channelId?: string; groupDmId?: string };
    const messageId = obj.messageId;
    if (!messageId) return;
    if (obj.channelId) discussionCache.removeChannelMessage(obj.channelId, messageId);
    if (obj.channelId || obj.groupDmId) {
      invalidateQueries({ queryKey: inboxKeys.all });
    }
  };
  s.on('message:delete', onMessageDelete);
  s.on('message:deleted', onMessageDelete);

  s.on('reaction:update', (payload: { messageId?: string; reactions?: MessageReaction[] }) => {
    const messageId = payload?.messageId;
    if (!messageId) return;
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
      channelId?: string;
      serverId?: string;
      deleted?: boolean;
      overwrite?: unknown;
      overwriteRemoved?: unknown;
    }) => {
      const channelId = payload?.channelId;
      if (!channelId) return;
      if (payload?.deleted) {
        invalidateQueries({ queryKey: discussionKeys.channel(channelId) });
        const serverId = payload?.serverId;
        if (serverId) {
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

  s.on('server:channelsChanged', (payload: { serverId?: string }) => {
    const serverId = payload?.serverId;
    if (!serverId) return;
    invalidateQueries({ queryKey: discussionKeys.server(serverId) });
    invalidateQueries({ queryKey: discussionKeys.serverChannels(serverId) });
  });

  s.on('channel:pins:update', (payload: { channelId?: string }) => {
    const channelId = payload?.channelId;
    if (!channelId) return;
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
    invalidateQueries({ queryKey: inboxKeys.all });
  });

  s.on('notification:new', () => {
    invalidateQueries({ queryKey: discussionKeys.unreadCount() });
    invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    invalidateQueries({ queryKey: notificationKeys.list() });
  });

  s.on('groupdm:new', () => {
    invalidateQueries({ queryKey: discussionKeys.groupDms() });
    invalidateQueries({ queryKey: inboxKeys.all });
  });
}

function bindPresenceAndDmListeners(s: Socket) {
  s.on(
    'presence:update',
    (payload: {
      groupId?: string;
      userId?: number;
      state?: PresenceState;
      lastSeenAt?: string;
    }) => {
      const groupId = payload?.groupId;
      const userId = Number(payload?.userId);
      if (!groupId || !Number.isFinite(userId) || !payload.state) return;
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

  const invalidateGroupDm = (payload: { groupDmId?: string }, alsoList = false) => {
    const groupDmId = payload?.groupDmId;
    if (!groupDmId) return;
    invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
    if (alsoList) invalidateQueries({ queryKey: discussionKeys.groupDms() });
  };

  s.on('groupdm:member:add', (p) => invalidateGroupDm(p));
  s.on('groupdm:member:remove', (p) => invalidateGroupDm(p, true));
  s.on('groupdm:member:leave', (p) => invalidateGroupDm(p, true));
}
