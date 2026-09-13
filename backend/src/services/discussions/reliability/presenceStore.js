import { metricCount } from "./metrics.js";
import { getDiscussionPresenceWindowMs } from "../discussionPresence.js";

const SESSION_PREFIX = "discussion:session:";
const SESSION_SET_PREFIX = "discussion:user:sessions:";

/**
 * Redis-backed presence with noop fallback.
 * Falls back gracefully when REDIS_URL is absent or connection fails.
 */
export async function createPresenceStore() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return createNoopPresenceStore("missing REDIS_URL");
  }

  try {
    const redisMod = await import("redis");
    const client = redisMod.createClient({ url: redisUrl });
    client.on("error", (err) => {
      console.error("Redis presence client error:", err?.message || err);
    });
    await client.connect();

    const ttlSeconds = Math.max(
      60,
      Number(process.env.DISCUSSION_SESSION_TTL_SECONDS || 5 * 60)
    );

    return {
      kind: "redis",
      ttlSeconds,
      async upsertSession({ socketId, userId, serverId, connectedAt, lastSeenAt }) {
        const key = `${SESSION_PREFIX}${socketId}`;
        await client.hSet(key, {
          userId: String(userId),
          serverId: String(serverId),
          connectedAt: String(connectedAt?.toISOString?.() ?? new Date().toISOString()),
          lastSeenAt: String(lastSeenAt?.toISOString?.() ?? new Date().toISOString()),
          disconnectedAt: "",
        });
        await client.expire(key, ttlSeconds);
        await client.sAdd(`${SESSION_SET_PREFIX}${userId}`, socketId);
      },
      async touchSession(socketId) {
        const key = `${SESSION_PREFIX}${socketId}`;
        const exists = await client.exists(key);
        if (!exists) return;
        await client.hSet(key, { lastSeenAt: new Date().toISOString(), disconnectedAt: "" });
        await client.expire(key, ttlSeconds);
      },
      async closeSession(socketId) {
        const key = `${SESSION_PREFIX}${socketId}`;
        const session = await client.hGetAll(key);
        if (!session?.userId) return;
        await client.hSet(key, {
          disconnectedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        });
        await client.expire(key, 30);
        await client.sRem(`${SESSION_SET_PREFIX}${session.userId}`, socketId);
      },
      async getActiveUserIds(userIds) {
        const now = Date.now();
        const thresholdMs = Math.max(30_000, getDiscussionPresenceWindowMs().activeMs);
        const active = new Set();
        for (const userId of userIds) {
          const sockets = await client.sMembers(`${SESSION_SET_PREFIX}${userId}`);
          for (const socketId of sockets) {
            const key = `${SESSION_PREFIX}${socketId}`;
            const row = await client.hGetAll(key);
            if (!row?.lastSeenAt || row?.disconnectedAt) continue;
            const seenAt = new Date(row.lastSeenAt).getTime();
            if (Number.isFinite(seenAt) && now - seenAt <= thresholdMs) {
              active.add(Number(userId));
              break;
            }
          }
        }
        return active;
      },
      async cleanupStaleSessions() {
        // Expiry handles most cleanup; this metric is a marker for scheduled runs.
        metricCount("presence.cleanup_runs", 1);
      },
      async shutdown() {
        await client.quit();
      },
    };
  } catch (error) {
    console.warn("Redis presence disabled:", error?.message || error);
    return createNoopPresenceStore("redis init failed");
  }
}

function createNoopPresenceStore(reason) {
  return {
    kind: "noop",
    reason,
    ttlSeconds: 0,
    async upsertSession() {},
    async touchSession() {},
    async closeSession() {},
    async getActiveUserIds() {
      return new Set();
    },
    async cleanupStaleSessions() {},
    async shutdown() {},
  };
}

