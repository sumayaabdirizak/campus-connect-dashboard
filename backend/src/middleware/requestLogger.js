import morgan from "morgan";

/**
 * Logs method, URL, status, and response time (ms) for every HTTP request.
 * Uses Morgan's built-in `:response-time` (time from request to headers sent).
 */
export function requestLogger() {
  const fmt =
    process.env.NODE_ENV === "production"
      ? ':remote-addr :method :url HTTP/:http-version :status :res[content-length] - :response-time ms'
      : ':method :url :status :response-time ms';

  return morgan(fmt, {
    skip: (req) => req.path === "/health",
  });
}
