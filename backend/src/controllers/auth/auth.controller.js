import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../utils/httpError.js';
import { syncDiscussionMembershipsForUser } from '../../services/discussions/membershipSync.service.js';
import { revokeJti, isJtiRevoked } from '../../utils/tokenRevocation.js';
import { readCookie } from '../../utils/cookies.js';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  buildPayload,
  issueAccessToken,
  issueRefreshToken,
  setAuthCookies,
  getIsProduction,
  issueCsrfCookie,
  listAvailableRoleNames,
} from './auth.helpers.js';

export async function postLogin(req, res) {
  const { email, password } = req.body;
  const { verifyPassword } = await import('../../utils/password.js');

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) {
    throw new HttpError(401, 'Invalid credentials', null);
  }

  const match = await verifyPassword(password, user.password_hash);
  if (!match) {
    throw new HttpError(401, 'Invalid credentials', null);
  }

  // Disabled accounts (INACTIVE / SUSPENDED) can't log in even with valid
  // credentials. Checked after the password compare so it doesn't reveal
  // account state to an unauthenticated guesser.
  if (user.status !== 'ACTIVE') {
    throw new HttpError(403, 'Account is not active. Contact your administrator.', null);
  }

  try {
    await syncDiscussionMembershipsForUser(user.id);
  } catch (err) {
    console.error('[auth] discussion membership sync on login failed', {
      userId: user.id,
      message: err?.message,
    });
  }

  const jwtPayload = await buildPayload(user);
  const accessToken = issueAccessToken(jwtPayload);
  const refreshToken = issueRefreshToken(jwtPayload);
  setAuthCookies(res, accessToken, refreshToken);
  const csrfToken = issueCsrfCookie(req, res);
  const availableRoles = await listAvailableRoleNames(user.id);

  // Best-effort — powers the "User Logs" oversight report. Never blocks login.
  prisma.userLoginLog
    .create({
      data: {
        userId: user.id,
        ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').toString().slice(0, 64) || null,
        userAgent: (req.headers['user-agent'] || '').toString().slice(0, 300) || null,
      },
    })
    .catch((err) => {
      console.error('[auth] login log write failed', { userId: user.id, message: err?.message });
    });

  // Respond with user info only (token is in httpOnly cookie)
  res.json({
    csrfToken,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role.name,
      availableRoles,
      scope: {
        facultyId: jwtPayload.facultyId,
        departmentId: jwtPayload.departmentId,
        programId: jwtPayload.programId,
        facultyIds: jwtPayload.facultyIds ?? [],
      },
    },
  });
}

/**
 * Re-issue the JWT under a different role the user holds (primary role or a
 * granted `UserRole`). Requires an already-valid access token — this is a
 * privilege *switch*, not an elevation, so it re-verifies membership
 * server-side rather than trusting the request body.
 */
export async function postSwitchRole(req, res) {
  const userId = Number(req.user?.sub ?? req.user?.id);
  const targetRole = String(req.body?.role ?? '').toUpperCase();
  if (!userId || !targetRole) {
    throw new HttpError(400, 'role is required', null);
  }

  const availableRoles = await listAvailableRoleNames(userId);
  if (!availableRoles.includes(targetRole)) {
    throw new HttpError(403, 'You do not hold that role', null);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user || user.status !== 'ACTIVE') {
    throw new HttpError(401, 'Invalid session', null);
  }

  const jwtPayload = await buildPayload(user, targetRole);
  const accessToken = issueAccessToken(jwtPayload);
  const refreshToken = issueRefreshToken(jwtPayload);
  setAuthCookies(res, accessToken, refreshToken);
  const csrfToken = issueCsrfCookie(req, res);

  res.json({
    csrfToken,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: targetRole,
      availableRoles,
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
    return res.status(401).json({ message: 'Missing refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, env.JWT_SECRET);
    if (payload.tokenType !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Enforce the revocation deny-list on the refresh path — the `auth`
    // middleware only checks it for access tokens. Without this, a refresh
    // token revoked on logout or by rotation would still mint fresh access
    // tokens.
    if (payload.jti && (await isJtiRevoked(payload.jti))) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      include: { role: true },
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    // Session bust: password change / admin disable increments tokenVersion.
    if (payload.tv != null && Number(payload.tv) !== Number(user.tokenVersion ?? 0)) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    try {
      await syncDiscussionMembershipsForUser(user.id);
    } catch (err) {
      console.error('[auth] discussion membership sync on refresh failed', {
        userId: user.id,
        message: err?.message,
      });
    }

    const jwtPayload = await buildPayload(user);
    const newAccessToken = issueAccessToken(jwtPayload);
    const newRefreshToken = issueRefreshToken(jwtPayload);
    setAuthCookies(res, newAccessToken, newRefreshToken);
    const csrfToken = issueCsrfCookie(req, res);

    // Refresh-token rotation: revoke the OLD refresh token now that a fresh
    // one has been issued. Without this, an attacker who captured the
    // refresh token could keep refreshing indefinitely.
    if (payload?.jti && payload?.exp) {
      await revokeJti(payload.jti, new Date(payload.exp * 1000), {
        userId: typeof payload.sub === 'number' ? payload.sub : null,
        reason: 'refresh_rotation',
      });
    }

    return res.json({ success: true, csrfToken });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function getCsrf(req, res) {
  const csrfToken = issueCsrfCookie(req, res);
  return res.json({ csrfToken });
}

export async function postLogout(req, res) {
  const isProduction = getIsProduction();

  // Server-side revocation: decode the access + refresh tokens and stamp
  // them as revoked so stolen tokens cannot be replayed after logout.
  const accessToken = readCookie(req, ACCESS_COOKIE);
  const refreshToken = readCookie(req, REFRESH_COOKIE);
  const userId = req.user?.id ?? req.user?.sub ?? null;

  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken);
      if (decoded?.jti && decoded?.exp) {
        await revokeJti(decoded.jti, new Date(decoded.exp * 1000), {
          userId: typeof userId === 'number' ? userId : null,
          reason: 'logout',
        });
      }
    } catch (e) {
      console.error('[auth] failed to revoke access token on logout', { message: e?.message });
    }
  }
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);
      if (decoded?.jti && decoded?.exp) {
        await revokeJti(decoded.jti, new Date(decoded.exp * 1000), {
          userId: typeof userId === 'number' ? userId : null,
          reason: 'logout',
        });
      }
    } catch (e) {
      console.error('[auth] failed to revoke refresh token on logout', { message: e?.message });
    }
  }

  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true });
}
