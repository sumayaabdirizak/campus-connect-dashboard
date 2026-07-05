export const MAX_DISCUSSION_HISTORY_LIMIT = 100;

export function parseDiscussionHistoryLimit(input) {
  const n = Number(input ?? 50);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(n, MAX_DISCUSSION_HISTORY_LIMIT);
}

export function encodeDiscussionCursor(createdAt, id) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString("base64url");
}

export function decodeDiscussionCursor(cursor) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
    if (!parsed?.createdAt || !Number.isFinite(Number(parsed?.id))) return null;
    const dt = new Date(parsed.createdAt);
    if (Number.isNaN(dt.getTime())) return null;
    return { createdAt: dt, id: Number(parsed.id) };
  } catch {
    return null;
  }
}
