import { prisma } from "../../db/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { issueCsrfCookie } from "../../middleware/csrf.js";
import { getFacultyIdForFacultyAdminUser } from "../../utils/facultyAccess.js";
import { HttpError } from "../../utils/httpError.js";
import { syncDiscussionMembershipsForUser } from "../../features/discussions/membershipSync.service.js";

const __agentLogPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../debug-b7cda9.log");

const ACCESS_COOKIE = "auth_token";
const REFRESH_COOKIE = "refresh_token";
const ACCESS_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getIsProduction() {
  return process.env.NODE_ENV === "production";
}

async function buildPayload(user) {
  const roleName = user.role?.name;
  // #region agent log
  fetch("http://127.0.0.1:7768/ingest/31870779-47f0-4312-b278-1c6da891de23", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b7cda9" },
    body: JSON.stringify({
      sessionId: "b7cda9",
      hypothesisId: "H_buildPayload_entry",
      location: "auth.controller.js:buildPayload:entry",
      message: "buildPayload role",
      data: { roleName: roleName ?? null, userId: user.id },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  try {
    fs.appendFileSync(
      __agentLogPath,
      `${JSON.stringify({
        sessionId: "b7cda9",
        hypothesisId: "H_buildPayload_entry",
        location: "auth.controller.js:buildPayload:entry:file",
        message: "buildPayload role",
        data: { roleName: roleName ?? null, userId: user.id },
        timestamp: Date.now(),
      })}\n`,
    );
  } catch {
    /* ignore */
  }
  // #endregion
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

function issueAccessToken(payload) {
  return jwt.sign({ ...payload, tokenType: "access" }, env.JWT_SECRET, {
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

function issueRefreshToken(payload) {
  return jwt.sign({ sub: payload.sub, tokenType: "refresh" }, env.JWT_SECRET, {
    expiresIn: REFRESH_TTL_SECONDS,
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

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new HttpError(401, "Invalid credentials", null);
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
  // #region agent log
  fetch("http://127.0.0.1:7768/ingest/31870779-47f0-4312-b278-1c6da891de23", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "b7cda9" },
    body: JSON.stringify({
      sessionId: "b7cda9",
      hypothesisId: "H_login_phase",
      location: "auth.controller.js:postLogin:before_buildPayload",
      message: "postLogin phase marker",
      data: { loginPhase, role: user.role?.name ?? null, userId: user.id },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  try {
    fs.appendFileSync(
      __agentLogPath,
      `${JSON.stringify({
        sessionId: "b7cda9",
        hypothesisId: "H_login_phase",
        location: "auth.controller.js:postLogin:before_buildPayload:file",
        message: "postLogin phase marker",
        data: { loginPhase, role: user.role?.name ?? null, userId: user.id },
        timestamp: Date.now(),
      })}\n`,
    );
  } catch {
    /* ignore */
  }
  // #endregion

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

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      include: { role: true },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
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
