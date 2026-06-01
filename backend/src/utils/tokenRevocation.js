import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.js";

/**
 * Token-revocation helpers.
 *
 * Without these, a JWT stolen via XSS/laptop-left-open/etc. stays valid
 * until its natural expiry (1 hour for access, 14 days for refresh) even
 * after the user clicks Logout. The deny-list closes that window:
 *   - every token is issued with a UUID `jti`
 *   - `postLogout` inserts the access + refresh `jti` into RevokedToken
 *   - the `auth` middleware checks the deny-list after `jwt.verify`
 *
 * Performance: ~1ms extra per authenticated request (a single indexed
 * lookup on PK). The cleanup cron in `cron/cleanRevokedTokens.js` keeps
 * the table small by deleting rows whose `expiresAt` has passed (the
 * underlying JWT is already invalid by then so the row is moot).
 */

/**
 * Generate a fresh JWT ID (a v4 UUID). Used by token issuance to ensure
 * every token can be revoked independently of its peers.
 */
export function newJti() {
  return randomUUID();
}

/**
 * Insert a `(jti, expiresAt)` row so future requests presenting this token
 * are rejected. Idempotent — if the jti is already revoked we silently
 * succeed (the user pressed Logout twice in quick succession).
 *
 * @param {string} jti
 * @param {Date} expiresAt - When the underlying JWT would naturally expire
 * @param {{ userId?: number | null, reason?: string }} [meta]
 */
export async function revokeJti(jti, expiresAt, meta = {}) {
  if (!jti) return;
  try {
    await prisma.revokedToken.upsert({
      where: { jti },
      update: {},
      create: {
        jti,
        userId: meta.userId ?? null,
        reason: meta.reason ?? "logout",
        expiresAt,
      },
    });
  } catch (e) {
    // Best-effort: if the DB hiccups we don't want to fail the logout
    // response. Log so ops can spot a pattern, but proceed.
    console.error("[tokenRevocation] failed to revoke jti", { jti, message: e?.message });
  }
}

/**
 * @param {string} jti
 * @returns {Promise<boolean>} true if the jti is currently revoked
 */
export async function isJtiRevoked(jti) {
  if (!jti) return false;
  const row = await prisma.revokedToken.findUnique({
    where: { jti },
    select: { jti: true },
  });
  return !!row;
}

/**
 * Force-revoke every active token belonging to a user. Used when an admin
 * disables an account, when the user changes their password, or as a
 * "log me out of every device" feature.
 *
 * Note: we don't know the active jtis without the tokens themselves, so
 * this only works in combination with a `userId`-keyed jti issuance
 * scheme. For now this is a placeholder — call sites can be added later.
 */
export async function revokeAllForUser(_userId, _reason = "admin_revoke") {
  // Intentional no-op until we track issued tokens with their jti per user.
  // Documented so future work has a clear hook point.
}
