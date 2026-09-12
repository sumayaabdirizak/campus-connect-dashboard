import type { Socket } from 'socket.io-client';
import { roomRefCounts, type RoomKey } from '@/lib/discussions/queries/socket-state';

type JoinAck = { ok?: boolean; code?: string; message?: string };

const JOIN_MAX_ATTEMPTS = 4;
const joinRetryTimers = new Map<RoomKey, ReturnType<typeof setTimeout>>();

export function clearJoinRetry(room: RoomKey) {
  const t = joinRetryTimers.get(room);
  if (t) clearTimeout(t);
  joinRetryTimers.delete(room);
}

export function clearAllJoinRetries() {
  for (const room of [...joinRetryTimers.keys()]) clearJoinRetry(room);
}

function isAckOk(ack: unknown): boolean {
  if (ack == null) return true;
  if (typeof ack !== 'object') return true;
  const o = ack as JoinAck;
  if (o.ok === false) return false;
  return true;
}

/**
 * Emit the matching *:join event and retry when the server ack fails or times out.
 * No-ops until the socket is connected — `rejoinAllRooms` runs on connect.
 */
export function emitJoinForRoom(s: Socket, room: RoomKey, attempt = 0): void {
  if (!s.connected) return;
  if ((roomRefCounts.get(room) ?? 0) <= 0) return;

  clearJoinRetry(room);

  const finish = (ack: unknown) => {
    if (isAckOk(ack)) return;
    if (attempt + 1 >= JOIN_MAX_ATTEMPTS) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[discussions] room join failed', room, ack);
      }
      return;
    }
    const delay = 400 * (attempt + 1);
    const timer = setTimeout(() => emitJoinForRoom(s, room, attempt + 1), delay);
    joinRetryTimers.set(room, timer);
  };

  const withTimeout = (cb: (ack: unknown) => void) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cb({ ok: false, code: 'TIMEOUT', message: 'join ack timeout' });
    }, 4000);
    return (ack: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cb(ack);
    };
  };

  if (room.startsWith('channel:')) {
    const channelId = room.split(':')[1];
    s.emit('channel:join', { channelId }, withTimeout(finish));
  } else if (room.startsWith('groupdm:')) {
    const groupDmId = room.split(':')[1];
    s.emit('groupdm:join', { groupDmId }, withTimeout(finish));
  } else if (room.startsWith('discussion:')) {
    const groupId = room.split(':')[1];
    s.emit(
      'join:group',
      { groupId, deviceId: 'web-default', fromVersion: 0 },
      withTimeout(finish)
    );
  }
}
