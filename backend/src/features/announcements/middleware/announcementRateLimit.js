import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const announcementsCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ANNOUNCEMENTS_CREATE_RATE_LIMIT_PER_MIN ?? 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", code: "ANNOUNCEMENTS_RATE_LIMIT" },
});

/** Per-user rate limit for POST /read-bulk (keyed on `req.user.sub`). */
export const announcementsReadBulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ANNOUNCEMENTS_READ_BULK_RATE_LIMIT_PER_MIN ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const sub = req.user?.sub;
    return sub != null ? `u:${sub}` : `ip:${ipKeyGenerator(req, res)}`;
  },
  message: { error: "Too many requests", code: "ANNOUNCEMENTS_READ_BULK_RATE_LIMIT" },
});
