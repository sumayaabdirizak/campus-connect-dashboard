/**
 * Structured logs for announcements (JSON lines for grep-friendly ops).
 * @param {'info'|'warn'|'error'} level
 * @param {string} msg
 * @param {Record<string, unknown>} [meta]
 */
export function announcementLog(level, msg, meta = {}) {
  const line = JSON.stringify({
    scope: "announcements",
    level,
    msg,
    ts: new Date().toISOString(),
    ...meta,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
