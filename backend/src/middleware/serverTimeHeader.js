/** Stamp every response with authoritative server time for client clock sync. */
export function serverTimeHeader(_req, res, next) {
  res.setHeader('X-Server-Time', new Date().toISOString());
  next();
}
