// src/middleware/auth.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { apiErrorBody } from "../utils/apiEnvelope.js";
import { isJtiRevoked } from "../utils/tokenRevocation.js";
import { readCookie } from "../utils/cookies.js";

export async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = readCookie(req, "auth_token");
  const token = bearerToken || cookieToken;

  if (!token) return res.status(401).json(apiErrorBody("Missing token", null));

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.debug("Auth middleware: token verification failed");
    }
    return res.status(401).json(apiErrorBody("Invalid token", null));
  }

  if (payload.tokenType != null && payload.tokenType !== "access") {
    return res.status(401).json(apiErrorBody("Invalid token", null));
  }

  // Deny-list check — if the token's jti was added to RevokedToken on
  // logout (or admin force-revoke), treat it as expired. Adds ~1ms per
  // authenticated request (single indexed lookup on PK). Worth it: closes
  // the 1-hour window where a stolen token would otherwise stay valid
  // after the user clicked Logout.
  if (payload.jti) {
    try {
      if (await isJtiRevoked(payload.jti)) {
        return res.status(401).json(apiErrorBody("Token has been revoked", null));
      }
    } catch (e) {
      // Fail-closed: if the deny-list DB lookup errors, we'd rather 401 a
      // legitimate request than green-light a potentially-revoked one.
      console.error("[auth] revocation lookup failed", { message: e?.message });
      return res.status(503).json(apiErrorBody("Auth temporarily unavailable", null));
    }
  }

  // Account-status enforcement. The token can outlive an admin disabling the
  // account (up to 1h for access tokens), so we check live status on every
  // request — a user flipped to INACTIVE/SUSPENDED is locked out immediately
  // rather than at token expiry. One indexed PK lookup (~1ms).
  let account;
  try {
    account = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { status: true },
    });
  } catch (e) {
    // Fail-closed, same rationale as the revocation lookup above.
    console.error("[auth] account-status lookup failed", { message: e?.message });
    return res.status(503).json(apiErrorBody("Auth temporarily unavailable", null));
  }
  if (!account) return res.status(401).json(apiErrorBody("Invalid token", null));
  if (account.status !== "ACTIVE") {
    return res.status(403).json(apiErrorBody("Account is not active", null));
  }

  const facultyId = payload.facultyId ?? payload.faculty_id ?? null;
  req.user = {
    ...payload,
    facultyId,
    faculty_id: facultyId,
  };
  next();
}