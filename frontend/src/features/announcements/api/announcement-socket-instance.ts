import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/api-config';
import { getJwtToken } from './announcement-socket-utils';

let announcementSocket: Socket | null = null;

export function disconnectAnnouncementSocket() {
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
  const socket =
    announcementSocket ??
    io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: jwtToken ? { token: jwtToken } : undefined,
    });

  announcementSocket = socket;
  return socket;
}
