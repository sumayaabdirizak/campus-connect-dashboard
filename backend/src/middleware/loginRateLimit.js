import rateLimit from "express-rate-limit";

const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

export const loginRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10_000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in a minute." },
});

// Account-keyed limiter — caps attempts per login identifier (email or university ID).
export const loginRateLimitByAccount = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `acct:${String(req.body?.email ?? req.body?.login ?? '').trim().toLowerCase()}`,
  skip: (req) => !req.body?.email && !req.body?.login,
  message: { message: "Too many login attempts for this account. Please try again later." },
});
