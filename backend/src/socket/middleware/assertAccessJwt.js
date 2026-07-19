import { isJtiRevoked } from "../../utils/tokenRevocation.js";

/**
 * Access-token checks shared by Socket.IO (parity with HTTP `auth` middleware).
 * @param {import("jsonwebtoken").JwtPayload | string | null | undefined} payload
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function assertAccessJwt(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "invalid_payload" };
  }

  // Reject refresh tokens (and any future non-access types) on the socket.
  if (payload.tokenType != null && payload.tokenType !== "access") {
    return { ok: false, reason: "invalid_token_type" };
  }

  if (payload.jti) {
    try {
      if (await isJtiRevoked(payload.jti)) {
        return { ok: false, reason: "revoked" };
      }
    } catch {
      // Fail-closed: same rationale as HTTP auth middleware.
      return { ok: false, reason: "revocation_unavailable" };
    }
  }

  return { ok: true };
}
