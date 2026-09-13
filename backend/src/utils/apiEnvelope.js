/** Standard error body for direct `res.json` responses (middleware that does not use `next(err)`). */
export function apiErrorBody(message, details = null) {
  return { status: "error", message, details };
}

/** Standard success body — use for new endpoints; legacy endpoints may still return raw data. */
export function apiSuccessBody(data, message = "Request completed successfully") {
  return { status: "success", message, data };
}

/**
 * List success envelope that keeps a named domain key (e.g. `faculties`) for
 * existing clients while also exposing `results` / `totalCount` / `page`.
 *
 * @param {{
 *   message: string;
 *   name: string;
 *   items: unknown[];
 *   page: number;
 *   pageSize: number;
 *   totalCount: number;
 * }} args
 */
export function namedListSuccess({ message, name, items, page, pageSize, totalCount }) {
  return {
    status: "success",
    message,
    count: totalCount,
    [name]: items,
    totalCount,
    page,
    pageSize,
    results: items,
  };
}

/** Send a consistent success JSON response. */
export function sendSuccess(res, data, message, statusCode = 200) {
  return res.status(statusCode).json(apiSuccessBody(data, message));
}

/** Send a consistent error JSON response (bypasses global error handler). */
export function sendError(res, statusCode, message, details = null) {
  return res.status(statusCode).json(apiErrorBody(message, details));
}

/** Appends a short hint when Prisma errors suggest an out-of-date database schema. */
export function prismaSchemaDriftHint(error) {
  const code = error?.code;
  const msg = String(error?.message || "");
  if (code === "P2022" || code === "P2010") {
    return " Apply pending migrations from the backend folder: npx prisma migrate deploy";
  }
  if (
    /column\s+["']?isAnonymous["']?\s+does not exist/i.test(msg) ||
    /invalid.*value.*DiscussionMessageType/i.test(msg) ||
    /Unknown field [`']?replyTo[`']?/i.test(msg)
  ) {
    return " Restart the backend after: npx prisma generate (and migrate deploy if needed)";
  }
  return "";
}
