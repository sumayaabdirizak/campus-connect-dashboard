/**
 * Cookie parsing helpers, shared across the HTTP middleware (auth, CSRF) and
 * the Socket.IO handshake — the latter only has the raw Cookie header string,
 * not an Express `req`, so both shapes are supported.
 */

/**
 * Read a single cookie value from a raw Cookie header string.
 * @param {string | undefined | null} cookieHeader
 * @param {string} key
 * @returns {string | null}
 */
export function readCookieFromHeader(cookieHeader, key) {
  if (!cookieHeader) return null;
  const chunks = cookieHeader.split(";").map((entry) => entry.trim());
  for (const chunk of chunks) {
    const [name, ...rest] = chunk.split("=");
    if (name === key) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Read a single cookie value from an Express request.
 * @param {import("express").Request} req
 * @param {string} key
 * @returns {string | null}
 */
export function readCookie(req, key) {
  return readCookieFromHeader(req?.headers?.cookie, key);
}
