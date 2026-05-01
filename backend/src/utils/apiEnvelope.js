/** Standard error body for direct `res.json` responses (middleware that does not use `next(err)`). */
export function apiErrorBody(message, details = null) {
  return { status: "error", message, details };
}
