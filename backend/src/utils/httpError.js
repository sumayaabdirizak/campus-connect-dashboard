/**
 * Application error with HTTP status and optional machine- or human-readable details.
 */
export class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {string | string[] | Record<string, unknown> | null} [details]
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Sanitized 500 response for controllers that handle their own try/catch.
 * Logs the full error server-side (so it stays debuggable) but never sends
 * `err.message` to the client — raw Prisma/driver messages can reveal table
 * names, constraint names, and query shapes. Controllers that previously did
 * `res.status(500).json({ message, error: e.message })` now call this instead.
 *
 * @param {import("express").Response} res
 * @param {string} message  Stable, user-safe summary (e.g. "Failed to fetch courses")
 * @param {unknown} err     The caught error — logged, never serialized to the client
 */
export function respondInternalError(res, message, err) {
  if (process.env.NODE_ENV !== "test") {
    console.error(`[500] ${message}:`, err);
  }
  return res.status(500).json({ status: "error", message, details: null });
}
