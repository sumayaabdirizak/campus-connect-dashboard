import dotenv from "dotenv";

// Ensure local backend/.env values win over machine-level vars (e.g. global DATABASE_URL).
dotenv.config({ override: true });

function readInt(value, defaultValue) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

/** Validated, typed config — prefer this over scattered `process.env` reads. */
export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: readInt(process.env.PORT, 4000),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || "7d",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "http://localhost:3000",
  SOCKET_CORS: process.env.SOCKET_CORS || process.env.CORS_ORIGINS || "http://localhost:3000",
  REDIS_URL: process.env.REDIS_URL || null,
  isProduction: (process.env.NODE_ENV || "development") === "production",
  isDevelopment: (process.env.NODE_ENV || "development") !== "production",
};

export function assertEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }
}

/** Parse comma-separated CORS allowlist (shared by HTTP + Socket.IO). */
export function parseCorsOrigins(raw = env.CORS_ORIGINS) {
  return String(raw)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const DEFAULT_DEV_ORIGINS =
  "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001";

/** HTTP CORS allowlist — `CORS_ORIGINS` → `FRONTEND_URL` → dev defaults. */
export function getCorsAllowlist() {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    DEFAULT_DEV_ORIGINS;
  return parseCorsOrigins(raw);
}

/** Socket.IO CORS allowlist — `SOCKET_CORS_ORIGINS` → `FRONTEND_URL` → `CORS_ORIGINS` → dev defaults. */
export function getSocketCorsAllowlist() {
  const raw =
    process.env.SOCKET_CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGINS ||
    DEFAULT_DEV_ORIGINS;
  return parseCorsOrigins(raw);
}
