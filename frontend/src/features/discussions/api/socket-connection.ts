import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/api-config';
import { getSocketRef, roomRefCounts, setSocket, type RoomKey } from './socket-state';
import { bindGlobalListeners } from './socket-listeners';

export function ensureSocket(): Socket {
  const existing = getSocketRef();
  if (existing) return existing;
  const s = io(getSocketUrl(), {
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
  });
  setSocket(s);
  bindGlobalListeners(s);
  return s;
}

export function rejoinAllRooms() {
  const s = getSocketRef();
  if (!s) return;
  for (const [room, count] of roomRefCounts) {
    if (count <= 0) continue;
    emitJoinForRoom(s, room);
  }
}

function emitJoinForRoom(s: Socket, room: RoomKey) {
  if (room.startsWith('channel:')) {
    const channelId = Number(room.split(':')[1]);
    s.emit('channel:join', { channelId }, () => undefined);
  } else if (room.startsWith('groupdm:')) {
    const groupDmId = Number(room.split(':')[1]);
    s.emit('groupdm:join', { groupDmId }, () => undefined);
  } else if (room.startsWith('discussion:')) {
    const groupId = Number(room.split(':')[1]);
    s.emit('join:group', { groupId, deviceId: 'web-default', fromVersion: 0 }, () => undefined);
  }
}

export function unwrapMessage(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { message?: { id?: number }; id?: number };
  if (obj.message && typeof obj.message === 'object') return obj.message;
  if (typeof obj.id === 'number') return raw;
  return null;
}
