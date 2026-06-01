/**
 * URL-safety helpers for any user-supplied link that will later be rendered
 * as `<a href={url}>`. Without this, a teacher (or anyone who can write to
 * the resource / post tables) could store `javascript:alert(document.cookie)`
 * and pwn every student that clicks the link.
 *
 * The rule: only `http:`, `https:`, and relative URLs are allowed through
 * to storage. Everything else (`javascript:`, `data:`, `vbscript:`,
 * `file:`, etc.) gets rejected.
 *
 * Defense-in-depth: the frontend's Zod schema should refine the same way,
 * but the server is the authoritative gate because a hand-rolled POST
 * could bypass the client schema entirely.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * @param {unknown} input
 * @returns {boolean} true iff the URL is safe to store + render as an href
 */
export function isSafeExternalUrl(input) {
  if (typeof input !== "string") return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  // Allow same-origin / relative URLs ("/uploads/foo.pdf", "/dashboard/X")
  // — they can never escalate to a different scheme.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  // Block protocol-relative URLs ("//evil.com/foo") — they inherit the
  // page scheme but the host is attacker-controlled, which we never want
  // from a user-supplied resource URL.
  if (trimmed.startsWith("//")) return false;
  try {
    const u = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}

/**
 * Throws an HttpError 400 with a clear message if the URL is unsafe.
 * Use at the entry of any controller that persists a user-supplied link.
 */
export function assertSafeExternalUrl(input, fieldName = "url") {
  if (isSafeExternalUrl(input)) return;
  const err = new Error(
    `${fieldName} must be an http(s):// URL or a same-origin path`,
  );
  // @ts-expect-error attaching status code so the error handler returns 400
  err.statusCode = 400;
  throw err;
}
