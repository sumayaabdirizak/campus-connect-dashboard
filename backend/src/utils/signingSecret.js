import { env } from "../config/env.js";

/**
 * Resolve an HMAC / signing secret fail-closed.
 *
 * Prefers a dedicated secret (`envName`), falls back to the app-wide
 * JWT_SECRET (high-entropy and required at boot via assertEnv), and THROWS
 * if neither is set. It never silently degrades to a guessable literal like
 * "dev-secret" or "" — those fallbacks would let anyone forge the signed
 * QR tokens / attachment URLs / redirect links these secrets protect.
 *
 * @param {string} envName e.g. "QR_TOKEN_SECRET"
 * @returns {string}
 */
export function getSigningSecret(envName) {
  const dedicated = process.env[envName];
  if (dedicated && dedicated.length > 0) return dedicated;
  if (env.JWT_SECRET && env.JWT_SECRET.length > 0) return env.JWT_SECRET;
  throw new Error(`Missing signing secret: set ${envName} (or JWT_SECRET) in the environment`);
}
