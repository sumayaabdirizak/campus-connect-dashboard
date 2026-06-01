import rateLimit from "express-rate-limit";

const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

/**
 * Per-user rate limiters for endpoints that the audit flagged as
 * abuse-prone. Each limiter is keyed by `req.user.id` (falling back to IP
 * for unauthenticated paths), so a single noisy student can't degrade the
 * experience for everyone else.
 *
 * The limits are deliberately generous — these aren't login endpoints, so
 * we want to catch only abnormally-spammy clients (broken loops, malicious
 * scripts) rather than ordinary use.
 *
 * - Quiz violation: a real student triggers at most a handful per attempt
 *   (2-3 tab switches, copy/paste). 30 per minute is ~10× the realistic
 *   peak, so legitimate use never hits it but a tight loop dies quickly.
 *
 * - Push subscribe: the browser only re-subscribes after a permission
 *   change or VAPID-key rotation. 10 per hour is way more than needed.
 */
function keyByUserOrIp(req) {
  const uid = req.user?.id ?? req.user?.sub;
  if (uid != null) return `u:${uid}`;
  return `ip:${req.ip}`;
}

export const quizViolationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10_000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { message: "Too many violation reports — slow down." },
});

export const pushSubscribeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { message: "Too many push-subscription updates. Try again later." },
});
