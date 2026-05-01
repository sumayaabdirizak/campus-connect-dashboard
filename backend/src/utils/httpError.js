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
