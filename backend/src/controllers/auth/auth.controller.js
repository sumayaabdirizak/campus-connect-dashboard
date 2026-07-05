import { prisma } from "../../db/prisma.js";
import jwt from "jsonwebtoken";
import { verifyPassword } from "../../utils/password.js";
import { env } from "../../config/env.js";
import { issueCsrfCookie } from "../../middleware/csrf.js";
import { getFacultyIdForFacultyAdminUser } from "../../utils/facultyAccess.js";
import { HttpError } from "../../utils/httpError.js";
import { syncDiscussionMembershipsForUser } from "../../features/discussions/membershipSync.service.js";
import { newJti, revokeJti, isJtiRevoked } from "../../utils/tokenRevocation.js";
import { readCookie } from "../../utils/cookies.js";

const ACCESS_COOKIE = "auth_token";
const REFRESH_COOKIE = "refresh_token";
const ACCESS_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getIsProduction() {
  return process.env.NODE_ENV === "production";
}

async function buildPayload(user) {
  const roleName = user.role?.name;
  /** @type {{ id: number; sub: number; role: string; email: string; full_name: string; facultyId: number | null; departmentId: number | null; programId: number | null; facultyIds: number[] }} */
  const payload = {
    id: user.id,
    sub: user.id,
    role: roleName,
    email: user.email,
    full_name: user.full_name,
    facultyId: null,
    departmentId: null,
    programId: null,
    facultyIds: [],
  };

  if (roleName === "DEAN") {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId: user.id },
      select: { facultyId: true },
    });
    payload.facultyId = deanProfile?.facultyId ?? null;
  } else if (roleName === "FACULTY_ADMIN") {
    payload.facultyId = await getFacultyIdForFacultyAdminUser(user.id);
  } else if (roleName === "TEACHER") {
    const lp = await prisma.lecturerProfile.findUnique({
      where: { userId: user.id },
      include: { faculties: { select: { facultyId: true } } },
    });
    if (lp) {
      payload.departmentId = lp.departmentId;
      payload.facultyIds = lp.faculties.map((f) => f.facultyId);
      payload.facultyId = lp.faculties[0]?.facultyId ?? null;
    }
  } else if (roleName === "STUDENT") {
    const sp = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { facultyId: true, departmentId: true, programId: true },
    });
    if (sp) {
      payload.facultyId = sp.facultyId;
      payload.departmentId = sp.departmentId;
      payload.programId = sp.programId;
    }
  }

  return payload;
}

/**
 * Issue an access token with a fresh `jti` so it can be revoked
 * independently on logout. The `jti` rides in the JWT payload (jwt.sign
 * uses `jwtid` for the standard `jti` claim).
 */
function issueAccessToken(payload) {
  return jwt.sign({ ...payload, tokenType: "access" }, env.JWT_SECRET, {
    expiresIn: ACCESS_TTL_SECONDS,
    jwtid: newJti(),
  });
}

function issueRefreshToken(payload) {
  return jwt.sign({ sub: payload.sub, tokenType: "refresh" }, env.JWT_SECRET, {
    expiresIn: REFRESH_TTL_SECONDS,
    jwtid: newJti(),
  });
}

function setAuthCookies(res, accessToken, refreshToken) {
  const isProduction = getIsProduction();
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: ACCESS_TTL_SECONDS * 1000,
    path: "/",
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: REFRESH_TTL_SECONDS * 1000,
    path: "/",
  });
}

export async function postLogin(req, res) {
  const { email, password } = req.body;
  /** @type {string} */
  let loginPhase = "user_lookup";

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) {
    throw new HttpError(401, "Invalid credentials", null);
  }

  const match = await verifyPassword(password, user.password_hash);
  if (!match) {
    throw new HttpError(401, "Invalid credentials", null);
  }

  // Disabled accounts (INACTIVE / SUSPENDED) can't log in even with valid
  // credentials. Checked after the password compare so it doesn't reveal
  // account state to an unauthenticated guesser.
  if (user.status !== "ACTIVE") {
    throw new HttpError(403, "Account is not active. Contact your administrator.", null);
  }

  loginPhase = "discussion_sync";
  try {
    await syncDiscussionMembershipsForUser(user.id);
  } catch (err) {
    console.error("[auth] discussion membership sync on login failed", {
      userId: user.id,
      message: err?.message,
    });
  }

  loginPhase = "build_payload";

  const jwtPayload = await buildPayload(user);
  const accessToken = issueAccessToken(jwtPayload);
  const refreshToken = issueRefreshToken(jwtPayload);
  setAuthCookies(res, accessToken, refreshToken);
  const csrfToken = issueCsrfCookie(req, res);

  // Respond with user info only (token is in httpOnly cookie)
  res.json({
    csrfToken,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role.name,
      scope: {
        facultyId: jwtPayload.facultyId,
        departmentId: jwtPayload.departmentId,
        programId: jwtPayload.programId,
        facultyIds: jwtPayload.facultyIds ?? [],
      },
    },
  });
}

export async function postRefresh(req, res) {
  const refreshToken = readCookie(req, REFRESH_COOKIE);
  if (!refreshToken) {
    return res.status(401).json({ message: "Missing refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, env.JWT_SECRET);
    if (payload.tokenType !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Enforce the revocation deny-list on the refresh path too — the `auth`
    // middleware only checks it for access tokens. Without this, a refresh
    // token revoked on logout or by rotation would still mint fresh access
    // tokens. A presented-but-revoked refresh token also signals reuse
    // (theft / replay of a rotated token), so we reject it outright.
    if (payload.jti && (await isJtiRevoked(payload.jti))) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      include: { role: true },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    // A disabled account can't mint fresh access tokens via refresh either.
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Account is not active" });
    }

    try {
      await syncDiscussionMembershipsForUser(user.id);
    } catch (err) {
      console.error("[auth] discussion membership sync on refresh failed", {
        userId: user.id,
        message: err?.message,
      });
    }

    const jwtPayload = await buildPayload(user);
    const newAccessToken = issueAccessToken(jwtPayload);
    const newRefreshToken = issueRefreshToken(jwtPayload);
    setAuthCookies(res, newAccessToken, newRefreshToken);
    const csrfToken = issueCsrfCookie(req, res);

    // Refresh-token rotation: revoke the OLD refresh token now that a
    // fresh one has been issued. Without this step, an attacker who
    // captured the refresh token (via XSS / malware) could keep
    // refreshing forever even after the legitimate user has rotated.
    if (payload?.jti && payload?.exp) {
      await revokeJti(payload.jti, new Date(payload.exp * 1000), {
        userId: typeof payload.sub === "number" ? payload.sub : null,
        reason: "refresh_rotation",
      });
    }

    return res.json({ success: true, csrfToken });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

export async function getCsrf(req, res) {
  const csrfToken = issueCsrfCookie(req, res);
  return res.json({ csrfToken });
}

export async function postLogout(req, res) {
  const isProduction = getIsProduction();

  // Server-side revocation: decode the access + refresh tokens (without
  // verifying — we don't care if they're expired, only that we have the
  // jti to add to the deny-list) and stamp them as revoked. Without this
  // step, a token copied via XSS / malware / network capture before logout
  // would remain valid until its natural expiry (up to 1 hour for access,
  // 14 days for refresh). The deny-list closes that window.
  const accessToken = readCookie(req, ACCESS_COOKIE);
  const refreshToken = readCookie(req, REFRESH_COOKIE);
  const userId = req.user?.id ?? req.user?.sub ?? null;

  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      if (decoded?.jti && decoded?.exp) {
        await revokeJti(decoded.jti, new Date(decoded.exp * 1000), {
          userId: typeof userId === "number" ? userId : null,
          reason: "logout",
        });
      }
    } catch (e) {
      console.error("[auth] failed to revoke access token on logout", { message: e?.message });
    }
  }
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      if (decoded?.jti && decoded?.exp) {
        await revokeJti(decoded.jti, new Date(decoded.exp * 1000), {
          userId: typeof userId === "number" ? userId : null,
          reason: "logout",
        });
      }
    } catch (e) {
      console.error("[auth] failed to revoke refresh token on logout", { message: e?.message });
    }
  }

  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
  res.json({ success: true });
}
