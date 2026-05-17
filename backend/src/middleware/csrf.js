import crypto from "crypto";
import { apiErrorBody } from "../utils/apiEnvelope.js";

const CSRF_COOKIE = "csrf_token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCookie(req, key) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const chunks = cookieHeader.split(";").map((entry) => entry.trim());
  for (const chunk of chunks) {
    const [name, ...rest] = chunk.split("=");
    if (name === key) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function issueCsrfCookie(req, res) {
  const existing = readCookie(req, CSRF_COOKIE);
  const token = existing || crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
  });
  return token;
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const exemptPaths = new Set(["/auth/login", "/auth/refresh", "/auth/csrf"]);
  if (exemptPaths.has(req.path)) return next();

  const cookieToken = readCookie(req, CSRF_COOKIE);
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || headerToken !== cookieToken) {
    return res.status(403).json(apiErrorBody("Invalid CSRF token", null));
  }

  return next();
}
