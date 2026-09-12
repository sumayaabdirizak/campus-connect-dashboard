import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/api-config';
import { attachSocketAuthRecovery } from '@/lib/socket-auth-recovery';
import { getJwtToken } from './announcement-socket-utils';

let announcementSocket: Socket | null = null;
let detachAuthRecovery: (() => void) | null = null;

export function disconnectAnnouncementSocket() {
  if (detachAuthRecovery) {
    detachAuthRecovery();
    detachAuthRecovery = null;
  }
  if (announcementSocket) {
    announcementSocket.disconnect();
    announcementSocket = null;
  }
}

export function getAnnouncementSocket(): Socket | null {
  return announcementSocket;
}

export function getOrCreateAnnouncementSocket(token?: string | null): Socket {
  const jwtToken = getJwtToken(token);
  if (announcementSocket) {
    // Keep handshake auth in sync when a token becomes available later.
    if (jwtToken) announcementSocket.auth = { token: jwtToken };
    return announcementSocket;
  }

  // Polling first: WS-first often surfaces noisy "websocket error" on Windows
  // / LAN when the upgrade fails; polling still delivers announcement events.
  const socket = io(getSocketUrl(), {
    transports: ['polling', 'websocket'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    auth: jwtToken ? { token: jwtToken } : undefined,
  });

  announcementSocket = socket;
  detachAuthRecovery = attachSocketAuthRecovery(socket);
  return socket;
}
