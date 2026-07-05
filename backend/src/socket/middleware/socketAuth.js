import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { loadUserAnnouncementScope } from "../../utils/userAnnouncementScope.js";
import { readCookieFromHeader } from "../../utils/cookies.js";

/**
 * Socket.IO auth gate — mirrors the HTTP `/api` auth middleware.
 * Accepts Bearer header, handshake `auth.token`, or `auth_token` cookie.
 */
export function createSocketAuthMiddleware() {
  return async (socket, next) => {
    try {
      const headerAuth = socket.handshake.headers.authorization || "";
      const bearerToken = headerAuth.startsWith("Bearer ") ? headerAuth.slice(7) : null;
      const authToken = socket.handshake.auth?.token || null;
      const cookieToken = readCookieFromHeader(socket.handshake.headers.cookie, "auth_token");
      const token = bearerToken || authToken || cookieToken;
      if (!token) return next(new Error("Unauthorized"));

      const payload = jwt.verify(token, env.JWT_SECRET);
      const scope = await loadUserAnnouncementScope(prisma, Number(payload.sub));
      if (!scope) return next(new Error("Unauthorized"));

      if (scope.status !== "ACTIVE") return next(new Error("Unauthorized"));

      socket.data.user = {
        id: scope.userId,
        full_name: scope.full_name,
        role: scope.role,
        facultyIds: scope.facultyIds,
        departmentIds: scope.departmentIds,
        batchIds: scope.batchIds,
        sectionIds: scope.sectionIds,
      };
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  };
}
