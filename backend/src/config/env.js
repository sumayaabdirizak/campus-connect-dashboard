import dotenv from "dotenv";

// Ensure local backend/.env values win over machine-level vars (e.g. global DATABASE_URL).
dotenv.config({ override: true });

function readInt(value, defaultValue) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

/**
 * Parse JWT TTL like "15m", "1h", "7d", or plain seconds ("900").
 * @param {string | undefined | null} raw
 * @param {number} fallbackSeconds
 * @returns {number}
 */
export function parseTtlToSeconds(raw, fallbackSeconds) {
  if (raw == null || String(raw).trim() === "") return fallbackSeconds;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) {
    const n = Number.parseInt(s, 10);
    return n > 0 ? n : fallbackSeconds;
  }
  const m = /^(\d+)\s*([smhd])$/i.exec(s);
  if (!m) return fallbackSeconds;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return fallbackSeconds;
  const unit = m[2].toLowerCase();
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return n * mult;
}

/** Validated, typed config — prefer this over scattered `process.env` reads. */
export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: readInt(process.env.PORT, 4000),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || "7d",
  /** Access token lifetime in seconds (from JWT_EXPIRES_IN). */
  ACCESS_TTL_SECONDS: parseTtlToSeconds(process.env.JWT_EXPIRES_IN || "15m", 15 * 60),
  /** Refresh token lifetime in seconds (from REFRESH_EXPIRES_IN). */
  REFRESH_TTL_SECONDS: parseTtlToSeconds(process.env.REFRESH_EXPIRES_IN || "7d", 7 * 24 * 3600),
  CORS_ORIGINS: process.env.CORS_ORIGINS || "http://localhost:3000",
  SOCKET_CORS: process.env.SOCKET_CORS || process.env.CORS_ORIGINS || "http://localhost:3000",
  REDIS_URL: process.env.REDIS_URL || null,
  /** Incoming integration calls (university SIS → Campus Connect). */
  INTEGRATION_API_KEY: process.env.INTEGRATION_API_KEY || null,
  /** Outbound Jazeera University AIS (Campus Connect → university API). */
  UNIVERSITY_API_BASE_URL: process.env.UNIVERSITY_API_BASE_URL || null,
  UNIVERSITY_API_PARTNER_CODE: process.env.UNIVERSITY_API_PARTNER_CODE || 'campus_connect',
  UNIVERSITY_API_KEY: process.env.UNIVERSITY_API_KEY || null,
  UNIVERSITY_DEAN_USERNAME: process.env.UNIVERSITY_DEAN_USERNAME || null,
  UNIVERSITY_DEAN_PASSWORD: process.env.UNIVERSITY_DEAN_PASSWORD || null,
  /** Default password for newly synced students (must_change_password stays true). */
  UNIVERSITY_SYNC_DEFAULT_PASSWORD: process.env.UNIVERSITY_SYNC_DEFAULT_PASSWORD || null,
  isProduction: (process.env.NODE_ENV || "development") === "production",
  isDevelopment: (process.env.NODE_ENV || "development") !== "production",
};

/**
 * Configure Express `trust proxy` from TRUST_PROXY.
 * Off unless set — enables correct client IPs for rate limits behind nginx/Cloudflare.
 * Values: `1` / `true` (one hop), a hop count, or an Express trust-proxy string.
 * @param {import("express").Application} app
 */
export function configureTrustProxy(app) {
  const raw = process.env.TRUST_PROXY;
  if (raw == null || raw === "" || raw === "0" || raw === "false") return;
  if (raw === "true") {
    app.set("trust proxy", 1);
    return;
  }
  const hops = Number.parseInt(raw, 10);
  if (String(hops) === raw && Number.isFinite(hops) && hops >= 1) {
    app.set("trust proxy", hops);
    return;
  }
  app.set("trust proxy", raw);
}

export function assertEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }

    if (env.isProduction) {
    // A short or placeholder JWT secret makes every session forgeable.
    if (String(process.env.JWT_SECRET).length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters in production. " +
          "Generate one with: node -e \"console.log(crypto.randomBytes(48).toString('hex'))\""
      );
    }
    // Without an explicit allowlist the CORS fallback is the localhost dev
    // list — the real frontend would be silently CORS-blocked. Fail loudly
    // at boot instead of mysteriously at first request.
    if (!process.env.CORS_ORIGINS && !process.env.FRONTEND_URL) {
      throw new Error(
        "Set CORS_ORIGINS (comma-separated) or FRONTEND_URL in production so " +
          "the frontend origin is allowed to call this API."
      );
    }
    const driver = String(process.env.STORAGE_DRIVER || "local").toLowerCase();
    if (driver === "s3" || driver === "minio") {
      for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
        if (!process.env[key]) {
          throw new Error(`STORAGE_DRIVER=${driver} requires ${key} in production`);
        }
      }
    }
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
