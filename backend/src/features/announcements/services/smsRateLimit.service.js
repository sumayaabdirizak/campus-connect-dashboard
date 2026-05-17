import IORedis from "ioredis";
import { announcementLog } from "../announcementLogger.js";

/** @type {IORedis | null} */
let redis = null;

/**
 * Atomically increment daily SMS counter; returns whether this attempt may consume a send slot.
 * Key: `sms:limit:{userId}:{yyyy-mm-dd}` with TTL 86400s from first increment that day.
 * If `REDIS_URL` is unset, returns `true` (no limiter) and callers should log once per process if needed.
 *
 * @param {number} userId
 * @returns {Promise<{ allowed: boolean, usedRedis: boolean }>}
 */
export async function tryConsumeSmsDailySlot(userId) {
  const cap = Math.min(100, Math.max(1, Number(process.env.ANNOUNCEMENT_SMS_DAILY_CAP ?? 3)));
  const ttlSec = Math.min(172800, Math.max(60, Number(process.env.ANNOUNCEMENT_SMS_LIMIT_TTL_SEC ?? 86400)));
  const url = process.env.REDIS_URL;
  if (!url) {
    return { allowed: true, usedRedis: false };
  }
  if (!redis) {
    redis = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  const day = new Date().toISOString().slice(0, 10);
  const key = `sms:limit:${userId}:${day}`;
  const lua = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
if c > tonumber(ARGV[1]) then return 0 end
return 1
`;
  try {
    const ok = await redis.eval(lua, 1, key, String(cap), String(ttlSec));
    return { allowed: Number(ok) === 1, usedRedis: true };
  } catch (err) {
    announcementLog("warn", "sms.rate_limit_redis_failed", {
      userId,
      message: err?.message ?? String(err),
    });
    return { allowed: false, usedRedis: true };
  }
}

/** Test hook: reset singleton (Vitest). */
export function resetSmsRateLimitRedisForTests() {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}
