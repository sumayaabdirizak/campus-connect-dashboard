/**
 * Upload rate limit: 15 requests per rolling 60s window per user.
 * Uses Redis when REDIS_URL is set; otherwise an in-process sliding window (single-node only).
 */
import IORedis from "ioredis";

const WINDOW_MS = 60 * 1000;
const MAX_UPLOADS = 15;

let redis;
function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redis) {
    redis = new IORedis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    redis.on("error", (err) => {
      console.warn("[uploadRateLimit] redis error", err?.message);
    });
  }
  return redis;
}

/** @type {Map<string, { count: number, windowStart: number }>} */
const memoryStore = new Map();

function memoryCheck(userId) {
  const key = String(userId);
  const now = Date.now();
  const state = memoryStore.get(key) ?? { count: 0, windowStart: now };
  if (now - state.windowStart >= WINDOW_MS) {
    state.count = 0;
    state.windowStart = now;
  }
  state.count += 1;
  memoryStore.set(key, state);
  return state.count <= MAX_UPLOADS;
}

/**
 * @param {number} userId
 * @returns {Promise<boolean>} true if allowed
 */
export async function checkDiscussionUploadRateLimit(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) return false;
  const client = getRedis();
  if (client) {
    try {
      const key = `discussion:upload:${id}`;
      const n = await client.incr(key);
      if (n === 1) await client.pexpire(key, WINDOW_MS);
      return n <= MAX_UPLOADS;
    } catch {
      return memoryCheck(id);
    }
  }
  return memoryCheck(id);
}
