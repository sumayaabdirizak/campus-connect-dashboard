import type { Socket } from 'socket.io-client';
import { tryRefreshAccessToken } from '@/lib/api-client';

/** Handshake rejections that a token refresh can plausibly fix. */
const AUTH_ERROR_PATTERN = /unauthor|forbidden|token|jwt|expired|auth/i;

/**
 * Socket.IO verifies the JWT once, during the handshake. The access cookie is
 * short-lived, so any reconnect after it expires (sleep/wake, network blip, tab
 * backgrounded) re-sends a stale cookie and the handshake fails.
 *
 * Socket.IO does NOT auto-retry after a middleware error — the socket just stays
 * dead, which is why realtime "works after login, then silently stops". Refresh
 * the cookie and reconnect manually so the socket recovers on its own.
 */
export function attachSocketAuthRecovery(socket: Socket): () => void {
  let recovering = false;

  const onConnectError = (err: Error) => {
    if (recovering || !AUTH_ERROR_PATTERN.test(err.message)) return;
    recovering = true;
    void tryRefreshAccessToken()
      .then((refreshed) => {
        // A failed refresh means the session is genuinely over; api-client
        // already redirects to sign-in, so don't reconnect into another 401.
        if (refreshed) socket.connect();
      })
      .finally(() => {
        recovering = false;
      });
  };

  socket.on('connect_error', onConnectError);
  return () => {
    socket.off('connect_error', onConnectError);
  };
}
