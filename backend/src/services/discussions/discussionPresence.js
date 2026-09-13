/**
 * Discussion presence: windows from env, DND detection, member-facing payloads.
 *
 * Env (milliseconds):
 * - ACTIVE_WINDOW_MS or DISCUSSION_ACTIVE_WINDOW_MS — "online" (default 2 min)
 * - AWAY_WINDOW_MS or DISCUSSION_AWAY_WINDOW_MS — upper bound for "away" (default 15 min)
 */

export function getDiscussionPresenceWindowMs() {
  const activeMs = Math.max(
    10_000,
    Number(
      process.env.ACTIVE_WINDOW_MS ?? process.env.DISCUSSION_ACTIVE_WINDOW_MS ?? 120_000
    )
  );
  const awayMs = Math.max(
    activeMs,
    Number(process.env.AWAY_WINDOW_MS ?? process.env.DISCUSSION_AWAY_WINDOW_MS ?? 15 * 60_000)
  );
  return { activeMs, awayMs };
}

export function isDoNotDisturbStatus(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  const t = text.trim().toLowerCase();
  return t === "dnd" || t === "do not disturb" || t.includes("do not disturb");
}

/**
 * @param {object} p
 * @param {number} [p.now]
 * @param {boolean} p.hasOpenSession
 * @param {Date|string|null|undefined} p.lastActivityAt
 * @param {string|null|undefined} p.discussionCustomStatus
 */
export function computeMemberPresence(p) {
  const now = Number(p.now) || Date.now();
  const { activeMs, awayMs } = getDiscussionPresenceWindowMs();
  const last = p.lastActivityAt ? new Date(p.lastActivityAt).getTime() : 0;
  const delta = last ? now - last : Infinity;
  const rawStatus =
    typeof p.discussionCustomStatus === "string" ? p.discussionCustomStatus.trim() : "";

  if (!p.hasOpenSession) {
    return {
      presence: "offline",
      lastSeenAt: p.lastActivityAt ? new Date(p.lastActivityAt).toISOString() : null,
      statusLine: rawStatus || null,
      suppressPings: false,
      sessionConnected: false,
    };
  }

  if (isDoNotDisturbStatus(rawStatus)) {
    return {
      presence: "dnd",
      lastSeenAt: p.lastActivityAt ? new Date(p.lastActivityAt).toISOString() : new Date(now).toISOString(),
      statusLine: rawStatus || "Do not disturb",
      suppressPings: true,
      sessionConnected: true,
    };
  }

  if (delta <= activeMs) {
    return {
      presence: "online",
      lastSeenAt: p.lastActivityAt ? new Date(p.lastActivityAt).toISOString() : new Date(now).toISOString(),
      statusLine: rawStatus || "Online",
      suppressPings: false,
      sessionConnected: true,
    };
  }
  if (delta <= awayMs) {
    return {
      presence: "away",
      lastSeenAt: p.lastActivityAt ? new Date(p.lastActivityAt).toISOString() : null,
      statusLine: rawStatus || "Away",
      suppressPings: false,
      sessionConnected: true,
    };
  }

  return {
    presence: "away",
    lastSeenAt: p.lastActivityAt ? new Date(p.lastActivityAt).toISOString() : null,
    statusLine: rawStatus || "Away",
    suppressPings: false,
    sessionConnected: true,
    idleExtended: true,
  };
}

/** Remove user ids that set Do Not Disturb (discussion custom status). */
export async function excludeDoNotDisturbUserIds(prisma, userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const unique = [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
  if (unique.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, discussionCustomStatus: true },
  });
  const dnd = new Set(
    rows.filter((r) => isDoNotDisturbStatus(r.discussionCustomStatus ?? "")).map((r) => Number(r.id))
  );
  return unique.filter((id) => !dnd.has(id));
}
