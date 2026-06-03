import rateLimit from "express-rate-limit";

const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

export const loginRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10_000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in a minute." },
});

// Account-keyed limiter — the IP limiter above doesn't stop credential
// stuffing against ONE account from many rotating IPs. This caps attempts
// per email so a targeted account can't be brute-forced regardless of source
// IP. Keyed on the normalized email; skipped when no email is supplied (the
// validator will 400 those anyway).
export const loginRateLimitByAccount = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `acct:${String(req.body.email).trim().toLowerCase()}`,
  skip: (req) => !req.body?.email,
  message: { message: "Too many login attempts for this account. Please try again later." },
});
