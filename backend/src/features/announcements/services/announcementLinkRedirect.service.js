import crypto from "crypto";
import { env } from "../../../config/env.js";

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function signingSecret() {
  return process.env.ANNOUNCEMENT_LINK_REDIRECT_SECRET || env.JWT_SECRET || "";
}

/**
 * @param {string} hostname
 */
export function isAnnouncementRedirectHostAllowed(hostname) {
  const h = String(hostname || "").toLowerCase().trim();
  if (!h) return false;
  const list = String(process.env.ANNOUNCEMENT_LINK_REDIRECT_ALLOWED_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length) return list.some((allowed) => h === allowed || h.endsWith(`.${allowed}`));
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

/**
 * @param {{ announcementId: number; targetUrl: string; userId?: number | null }} input
 * @returns {string | null}
 */
export function encodeAnnouncementRedirectToken(input) {
  const secret = signingSecret();
  if (!secret) return null;
  const exp = Date.now() + TOKEN_TTL_MS;
  const payloadObj = {
    v: 1,
    a: input.announcementId,
    u: String(input.targetUrl).slice(0, 4000),
    e: exp,
    uid: input.userId == null ? null : Number(input.userId),
  };
  const payload = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * @param {string} token
 * @returns {{ announcementId: number; targetUrl: string; userId: number | null; exp: number } | null}
 */
export function decodeAnnouncementRedirectToken(token) {
  const secret = signingSecret();
  if (!secret || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || parsed.v !== 1 || typeof parsed.u !== "string") return null;
  const announcementId = Number(parsed.a);
  if (!Number.isFinite(announcementId)) return null;
  if (typeof parsed.e !== "number" || Date.now() > parsed.e) return null;
  const uid = parsed.uid == null ? null : Number(parsed.uid);
  return {
    announcementId,
    targetUrl: parsed.u,
    userId: Number.isFinite(uid) ? uid : null,
    exp: parsed.e,
  };
}

/**
 * @param {string} rawUrl
 * @returns {URL | null}
 */
export function parseAllowedRedirectUrl(rawUrl) {
  let u;
  try {
    u = new URL(String(rawUrl));
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!isAnnouncementRedirectHostAllowed(u.hostname)) return null;
  return u;
}

/**
 * @param {number} announcementId
 * @param {string} token
 * @param {string} [publicApiBase] e.g. https://api.example.com
 */
export function buildTrackedRedirectUrl(announcementId, token, publicApiBase) {
  const base = String(publicApiBase || process.env.PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  const enc = encodeURIComponent(token);
  return `${base}/api/r/${announcementId}/${enc}`;
}
