import rateLimit from "express-rate-limit";

const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

export const refreshRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10_000 : 10, // production/dev: 10/min; tests: effectively unlimited
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many refresh attempts. Please try again shortly." },
});
