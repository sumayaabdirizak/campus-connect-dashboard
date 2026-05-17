/**
 * Parse `page` and `pageSize` (alias: `limit`) from query strings.
 * @param {Record<string, unknown>} query
 * @param {{ defaultPageSize?: number; maxPageSize?: number }} [opts]
 */
export function parsePaginationQuery(query, opts = {}) {
  const defaultPageSize = opts.defaultPageSize ?? 10;
  const maxPageSize = opts.maxPageSize ?? 100;

  const pageRaw = Number(query.page ?? 1);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const sizeRaw = Number(query.pageSize ?? query.limit ?? defaultPageSize);
  let pageSize = Number.isFinite(sizeRaw) && sizeRaw >= 1 ? Math.floor(sizeRaw) : defaultPageSize;
  pageSize = Math.min(maxPageSize, pageSize);

  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

/**
 * Standard list envelope for APIs (Sprint 2 pagination contract).
 *
 * When `total` or `totalCount` is a finite number, both `total` (if passed) and `totalCount` are exposed
 * so clients can show hit counts and last page; prefer `totalCount` for new code.
 */
export function paginatedPayload({ total, totalCount, page, pageSize, results, nextCursor }) {
  const numeric =
    typeof totalCount === "number" && Number.isFinite(totalCount)
      ? totalCount
      : typeof total === "number" && Number.isFinite(total)
        ? total
        : undefined;

  return {
    ...(total !== undefined ? { total } : {}),
    ...(numeric !== undefined ? { totalCount: numeric } : {}),
    page,
    pageSize,
    results,
    ...(nextCursor != null && nextCursor !== "" ? { nextCursor } : {}),
  };
}

/**
 * Keyset pagination for announcements (`cursor` is opaque from {@link encodeAnnouncementCursor}).
 * @param {Record<string, unknown>} query
 * @param {{ defaultPageSize?: number; maxPageSize?: number }} [opts]
 */
export function parseCursorPagination(query, opts = {}) {
  const defaultPageSize = opts.defaultPageSize ?? 20;
  const maxPageSize = opts.maxPageSize ?? 100;
  const sizeRaw = Number(query.limit ?? defaultPageSize);
  let limit = Number.isFinite(sizeRaw) && sizeRaw >= 1 ? Math.floor(sizeRaw) : defaultPageSize;
  limit = Math.min(maxPageSize, limit);
  const cursor = typeof query.cursor === "string" && query.cursor.trim().length > 0 ? query.cursor.trim() : null;
  return { cursor, limit };
}
