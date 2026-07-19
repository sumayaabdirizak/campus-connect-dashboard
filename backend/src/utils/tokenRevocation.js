/**
 * Token-revocation helpers.
 *
 * Without these, a JWT stolen via XSS/laptop-left-open/etc. stays valid
 * until its natural expiry even after Logout. The deny-list + tokenVersion
 * close that window:
 *   - every token is issued with a UUID `jti` and the user's `tokenVersion` (`tv`)
 *   - `postLogout` inserts the access + refresh `jti` into RevokedToken
 *   - `revokeAllForUser` increments `User.tokenVersion` (password change / disable)
 *   - the `auth` middleware checks both the deny-list and live tokenVersion
 */

import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.js";

export function newJti() {
  return randomUUID();
}

/**
 * @param {string} jti
 * @param {Date} expiresAt
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
    console.error("[tokenRevocation] failed to revoke jti", { jti, message: e?.message });
  }
}

/**
 * @param {string} jti
 * @returns {Promise<boolean>}
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
 * Invalidate every outstanding JWT for a user by bumping `tokenVersion`.
 * Tokens issued before the bump fail auth until the user signs in again.
 *
 * @param {number} userId
 * @param {string} [reason]
 * @returns {Promise<{ ok: true, tokenVersion: number } | { ok: false, message: string }>}
 */
export async function revokeAllForUser(userId, reason = "admin_revoke") {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid user id" };
  }
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    console.info("[tokenRevocation] revokeAllForUser", { userId: id, reason, tokenVersion: updated.tokenVersion });
    return { ok: true, tokenVersion: updated.tokenVersion };
  } catch (e) {
    console.error("[tokenRevocation] revokeAllForUser failed", { userId: id, message: e?.message });
    return { ok: false, message: e?.message || "revoke failed" };
  }
}

/** Delete RevokedToken rows past natural JWT expiry (safe to call periodically). */
export async function cleanExpiredRevokedTokens() {
  const result = await prisma.revokedToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return { deleted: result.count };
}
