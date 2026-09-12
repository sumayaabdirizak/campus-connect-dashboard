import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/api-config';
import { getSocketRef, roomRefCounts, setSocket, type RoomKey } from '@/lib/discussions/queries/socket-state';
import { bindGlobalListeners } from '@/lib/discussions/queries/socket-listeners';
import { bindClubSocketListeners } from '@/lib/clubs/queries/club-socket-listeners';
import { attachSocketAuthRecovery } from '@/lib/socket-auth-recovery';
import { emitJoinForRoom } from '@/lib/discussions/queries/socket-join';

export function ensureSocket(): Socket {
  const existing = getSocketRef();
  if (existing) return existing;
  const s = io(getSocketUrl(), {
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000
  });
  setSocket(s);
  bindGlobalListeners(s);
  bindClubSocketListeners(s);
  attachSocketAuthRecovery(s);
  // Rooms live on the server per-connection, so a reconnect (including one
  // recovered from an expired token) starts with none — re-join what's open.
  s.on('connect', () => {
    rejoinAllRooms();
  });
  return s;
}

export function rejoinAllRooms() {
  const s = getSocketRef();
  if (!s?.connected) return;
  for (const [room, count] of roomRefCounts) {
    if (count <= 0) continue;
    emitJoinForRoom(s, room as RoomKey);
  }
}

export function unwrapMessage(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { message?: { id?: string | number }; id?: string | number };
  if (obj.message && typeof obj.message === 'object') return obj.message;
  if (typeof obj.id === 'string' || typeof obj.id === 'number') return raw;
  return null;
}
