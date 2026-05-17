/**
 * Parse @handles from plaintext (E2EE messages have no server-side content — no mentions).
 * Handle: /@(\w+)/g — word tokens (numbers, first names, roles like TA).
 */
export function extractMentionHandles(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  const seen = new Set();
  const out = [];
  const re = /@(\w+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ raw, key });
  }
  return out;
}

/**
 * @param {Array<{ userId: number; number: string; full_name: string }>} members
 * @param {Array<{ raw: string; key: string }>} handles from {@link extractMentionHandles}
 * @returns {number[]} distinct user ids (excluding sender) that match a handle
 */
export function resolveMentionUserIds(handles, members, senderId) {
  const ids = new Set();
  const sender = Number(senderId);
  for (const { key } of handles) {
    for (const m of members) {
      if (Number(m.userId) === sender) continue;
      const num = String(m.number || "").toLowerCase();
      if (num && num === key) {
        ids.add(Number(m.userId));
        continue;
      }
      const first = String(m.full_name || "")
        .trim()
        .split(/\s+/)[0]
        ?.replace(/[^\w]/g, "")
        .toLowerCase();
      if (first && first === key) {
        ids.add(Number(m.userId));
      }
    }
  }
  return [...ids];
}
