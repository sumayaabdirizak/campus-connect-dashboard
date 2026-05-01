import rateLimit from "express-rate-limit";

const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

export const loginRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10_000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in a minute." },
});
