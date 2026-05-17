import IORedis from "ioredis";
import { announcementLog } from "../announcementLogger.js";

/** @type {IORedis | null} */
let redis = null;
let redisInitFailed = false;

/**
 * Bounded in-memory fallback when REDIS_URL is unset (dev / single-process).
 * LRU-ish: insertion order is preserved by Map; evict oldest when over cap.
 * @type {Map<string, { status: number, body: unknown, at: number }>}
 */
const FALLBACK_STORE = new Map();
const FALLBACK_MAX_ENTRIES = 5000;

const IDEMPOTENCY_KEY_PREFIX = "announcements:idem:";
const IDEMPOTENCY_TTL_SEC = 24 * 60 * 60; // 24h

/** @returns {IORedis | null} */
function getRedis() {
  if (redis) return redis;
  if (redisInitFailed) return null;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redis = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    redis.on("error", (err) => {
      announcementLog("warn", "announcement.idempotency_redis_error", {
        message: err?.message ?? String(err),
      });
    });
    return redis;
  } catch (err) {
    redisInitFailed = true;
    announcementLog("warn", "announcement.idempotency_redis_init_failed", {
      message: err?.message ?? String(err),
    });
    return null;
  }
}

/**
 * @param {string} key
 * @returns {Promise<{ status: number, body: unknown } | null>}
 */
export async function readIdempotentResponse(key) {
  const client = getRedis();
  if (client) {
    try {
      const raw = await client.get(IDEMPOTENCY_KEY_PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.status === "number") {
        return { status: parsed.status, body: parsed.body };
      }
      return null;
    } catch (err) {
      announcementLog("warn", "announcement.idempotency_read_failed", {
        message: err?.message ?? String(err),
      });
      // Fall through to in-memory fallback to avoid total outage on Redis blips.
    }
  }
  const entry = FALLBACK_STORE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at >= IDEMPOTENCY_TTL_SEC * 1000) {
    FALLBACK_STORE.delete(key);
    return null;
  }
  return { status: entry.status, body: entry.body };
}

/**
 * @param {string} key
 * @param {number} status
 * @param {unknown} body
 */
export async function writeIdempotentResponse(key, status, body) {
  const client = getRedis();
  if (client) {
    try {
      await client.set(
        IDEMPOTENCY_KEY_PREFIX + key,
        JSON.stringify({ status, body }),
        "EX",
        IDEMPOTENCY_TTL_SEC,
      );
      return;
    } catch (err) {
      announcementLog("warn", "announcement.idempotency_write_failed", {
        message: err?.message ?? String(err),
      });
      // Fall through to in-memory fallback.
    }
  }
  // Evict oldest entry if at capacity (Map preserves insertion order).
  if (FALLBACK_STORE.size >= FALLBACK_MAX_ENTRIES) {
    const oldestKey = FALLBACK_STORE.keys().next().value;
    if (oldestKey !== undefined) FALLBACK_STORE.delete(oldestKey);
  }
  FALLBACK_STORE.set(key, { status, body, at: Date.now() });
}

/** Test hook: reset state for Vitest. */
export function resetIdempotencyStoreForTests() {
  FALLBACK_STORE.clear();
  if (redis) {
    redis.disconnect();
    redis = null;
  }
  redisInitFailed = false;
}
