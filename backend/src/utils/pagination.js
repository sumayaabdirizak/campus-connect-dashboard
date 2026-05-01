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
 */
export function paginatedPayload({ total, page, pageSize, results }) {
  return {
    total,
    page,
    pageSize,
    results,
  };
}
