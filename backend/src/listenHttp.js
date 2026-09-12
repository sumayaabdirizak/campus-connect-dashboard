/**
 * Listen with retries — Windows/nodemon often leave :PORT briefly busy (EADDRINUSE).
 * Always closes before retry so listeners do not stack on the same Server.
 */
export function listenHttp(httpServer, port, onListening) {
  const maxAttempts = 30;
  const delayMs = 750;
  let attempt = 0;
  let settled = false;

  const tryListen = () => {
    if (settled) return;

    const onError = (err) => {
      httpServer.off('listening', onListen);
      if (err?.code === 'EADDRINUSE' && attempt + 1 < maxAttempts) {
        attempt += 1;
        console.warn(
          `[server] port ${port} busy, retry ${attempt}/${maxAttempts} in ${delayMs}ms…`
        );
        try {
          httpServer.close();
        } catch {
          /* ignore */
        }
        setTimeout(tryListen, delayMs);
        return;
      }
      console.error(err);
      process.exit(1);
    };

    const onListen = () => {
      settled = true;
      httpServer.off('error', onError);
      onListening();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListen);
    httpServer.listen(port);
  };

  tryListen();
}