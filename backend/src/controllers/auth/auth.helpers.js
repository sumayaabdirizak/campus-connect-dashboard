/**
 * Shared constants and helpers for auth token issuance and cookie management.
 */
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { issueCsrfCookie } from '../../middleware/csrf.js';
import { newJti } from '../../utils/tokenRevocation.js';
import { prisma } from '../../db/prisma.js';
import { getFacultyIdForFacultyAdminUser } from '../../utils/facultyAccess.js';

export const ACCESS_COOKIE = 'auth_token';
export const REFRESH_COOKIE = 'refresh_token';
export const ACCESS_TTL_SECONDS = env.ACCESS_TTL_SECONDS;
export const REFRESH_TTL_SECONDS = env.REFRESH_TTL_SECONDS;

export function getIsProduction() {
  return process.env.NODE_ENV === 'production';
}

export async function buildPayload(user) {
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
    tv: user.tokenVersion ?? 0,
  };

  if (roleName === 'DEAN') {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId: user.id },
      select: { facultyId: true },
    });
    payload.facultyId = deanProfile?.facultyId ?? null;
  } else if (roleName === 'FACULTY_ADMIN') {
    payload.facultyId = await getFacultyIdForFacultyAdminUser(user.id);
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

export function setAuthCookies(res, accessToken, refreshToken) {
  const isProduction = getIsProduction();
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: ACCESS_TTL_SECONDS * 1000,
    path: '/',
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: REFRESH_TTL_SECONDS * 1000,
    path: '/',
  });
}

export { issueCsrfCookie };
