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
      .then((outcome) => {
        // 'signed-out': api-client has already redirected — reconnecting would
        // just handshake into another 401.
        // 'unavailable': the refresh endpoint was unreachable, which says
        // nothing about the session. Leave the socket down for now; the next
        // connect_error (or any API call) retries, and crucially the user is
        // not signed out over a blip.
        if (outcome === 'refreshed') socket.connect();
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
