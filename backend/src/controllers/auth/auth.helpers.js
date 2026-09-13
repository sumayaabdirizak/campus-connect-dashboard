/**
 * Shared constants and helpers for auth token issuance and cookie management.
 */
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { issueCsrfCookie } from '../../middleware/csrf.js';
import { newJti } from '../../utils/tokenRevocation.js';
import { prisma } from '../../db/prisma.js';

export const ACCESS_COOKIE = 'auth_token';
export const REFRESH_COOKIE = 'refresh_token';
export const ACCESS_TTL_SECONDS = env.ACCESS_TTL_SECONDS;
export const REFRESH_TTL_SECONDS = env.REFRESH_TTL_SECONDS;

export function getIsProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Resolve a login identifier to a user — email (contains @) or university ID / username.
 * @param {string} identifier
 */
export async function resolveLoginUser(identifier) {
  const raw = String(identifier ?? '').trim();
  if (!raw) return null;

  if (raw.includes('@')) {
    const byEmail = await prisma.user.findUnique({
      where: { email: raw.toLowerCase() },
      include: { role: true },
    });
    if (byEmail) return byEmail;
  }

  const byNumber = await prisma.user.findUnique({
    where: { number: raw },
    include: { role: true },
  });
  if (byNumber) return byNumber;

  return prisma.user.findFirst({
    where: { number: { equals: raw, mode: 'insensitive' } },
    include: { role: true },
  });
}

/**
 * @param {object} user
 * @param {string} [overrideRoleName] Role to sign the token as, when different
 *   from `user.role.name` (used by `POST /auth/switch-role`). Caller must
 *   verify the user actually holds this role before passing it in.
 */
export async function buildPayload(user, overrideRoleName) {
  const roleName = overrideRoleName ?? user.role?.name;
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
    tv: user.tokenVersion ?? 0,
  };

  if (roleName === 'DEAN') {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId: user.id },
      select: { facultyId: true },
    });
    payload.facultyId = deanProfile?.facultyId ?? null;
  } else if (roleName === 'TEACHER') {
    const lp = await prisma.lecturerProfile.findUnique({
      where: { userId: user.id },
      include: { faculties: { select: { facultyId: true } } },
    });
    if (lp) {
      payload.departmentId = lp.departmentId;
      payload.facultyIds = lp.faculties.map((f) => f.facultyId);
      payload.facultyId = lp.faculties[0]?.facultyId ?? null;
    }
  } else if (roleName === 'STUDENT') {
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
 * Every role name a user may act as: their primary role plus any granted
 * via `UserRole`. Used both to render the profile switcher and to verify a
 * `switch-role` request isn't asking for a role the user doesn't hold.
 * @param {number} userId
 * @returns {Promise<string[]>}
 */
export async function listAvailableRoleNames(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: { select: { name: true } },
      additionalRoles: { select: { role: { select: { name: true } } } },
    },
  });
  if (!user) return [];
  const names = new Set();
  if (user.role?.name) names.add(user.role.name);
  for (const ur of user.additionalRoles) {
    if (ur.role?.name) names.add(ur.role.name);
  }
  return [...names];
}

/**
 * Issue an access token with a fresh `jti` so it can be revoked
 * independently on logout.
 */
export function issueAccessToken(payload) {
  return jwt.sign({ ...payload, tokenType: 'access' }, env.JWT_SECRET, {
    expiresIn: ACCESS_TTL_SECONDS,
    jwtid: newJti(),
  });
}

export function issueRefreshToken(payload) {
  return jwt.sign(
    { sub: payload.sub, tokenType: 'refresh', tv: payload.tv ?? 0 },
    env.JWT_SECRET,
    {
      expiresIn: REFRESH_TTL_SECONDS,
      jwtid: newJti(),
    }
  );
}

export function setAccessCookie(res, accessToken) {
  const isProduction = getIsProduction();
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: ACCESS_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function setAuthCookies(res, accessToken, refreshToken) {
  setAccessCookie(res, accessToken);
  const isProduction = getIsProduction();
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: REFRESH_TTL_SECONDS * 1000,
    path: '/',
  });
}

/** Extend refresh cookie lifetime without rotating the token (multi-tab safe). */
export function touchRefreshCookie(res, refreshToken) {
  const isProduction = getIsProduction();
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: REFRESH_TTL_SECONDS * 1000,
    path: '/',
  });
}

export { issueCsrfCookie };
