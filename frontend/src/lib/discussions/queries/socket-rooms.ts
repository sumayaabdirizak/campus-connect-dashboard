import type { Socket } from 'socket.io-client';
import { ensureSocket } from '@/lib/discussions/queries/socket-connection';
import { getSocketRef, roomRefCounts, type RoomKey } from '@/lib/discussions/queries/socket-state';

export function getDiscussionSocket(): Socket {
  return ensureSocket();
}

export function joinRoom(room: RoomKey): void {
  const s = ensureSocket();
  const next = (roomRefCounts.get(room) ?? 0) + 1;
  roomRefCounts.set(room, next);
  if (next !== 1) return;

  if (room.startsWith('channel:')) {
    const channelId = room.split(':')[1];
    s.emit('channel:join', { channelId }, () => undefined);
  } else if (room.startsWith('groupdm:')) {
    const groupDmId = room.split(':')[1];
    s.emit('groupdm:join', { groupDmId }, () => undefined);
  } else if (room.startsWith('discussion:')) {
    const groupId = room.split(':')[1];
    s.emit('join:group', { groupId, deviceId: 'web-default', fromVersion: 0 }, () => undefined);
  }
}

export function leaveRoom(room: RoomKey): void {
  const s = getSocketRef();
  const next = (roomRefCounts.get(room) ?? 0) - 1;
  if (next <= 0) {
    roomRefCounts.delete(room);
    if (s) emitLeaveForRoom(s, room);
    return;
  }
  roomRefCounts.set(room, next);
}

function emitLeaveForRoom(s: Socket, room: RoomKey) {
  if (room.startsWith('channel:')) {
    s.emit('channel:leave', { channelId: room.split(':')[1] });
  } else if (room.startsWith('groupdm:')) {
    s.emit('groupdm:leave', { groupDmId: room.split(':')[1] });
  } else if (room.startsWith('discussion:')) {
    s.emit('leave:group', { groupId: room.split(':')[1] });
  }
}

export function emitTypingStart(args: { channelId?: string; groupDmId?: string }) {
  const s = ensureSocket();
  if (args.channelId) s.emit('typing:start', { channelId: args.channelId }, () => undefined);
  if (args.groupDmId) s.emit('typing:start', { groupDmId: args.groupDmId }, () => undefined);
}

export function emitTypingStop(args: { channelId?: string; groupDmId?: string }) {
  const s = ensureSocket();
  if (args.channelId) s.emit('typing:stop', { channelId: args.channelId }, () => undefined);
  if (args.groupDmId) s.emit('typing:stop', { groupDmId: args.groupDmId }, () => undefined);
}

export function emitMessageRead(args: {
  channelId?: string;
  groupDmId?: string;
  messageId: string;
}) {
  const s = ensureSocket();
  const { channelId, groupDmId, messageId } = args;
  if (channelId) {
    s.emit('message:read', { channelId, messageId }, () => undefined);
  } else if (groupDmId) {
    s.emit('message:read', { groupDmId, messageId }, () => undefined);
  }
}
