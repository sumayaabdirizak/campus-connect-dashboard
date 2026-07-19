import { parseDate } from './date-helpers.js';
import { matchesExtendedFilters, matchesSearch } from './filters.js';
import { resolveActiveSources, SOURCE_FETCHERS } from './source-registry.js';

/**
 * @param {{
 *   source?: string | null;
 *   module?: string | null;
 *   actionType?: string | null;
 *   severity?: string | null;
 *   status?: string | null;
 *   page?: number;
 *   pageSize?: number;
 *   dateFrom?: string | null;
 *   dateTo?: string | null;
 *   actorId?: number | null;
 *   search?: string | null;
 * }} opts
 */
export async function listPlatformAuditLogs(opts = {}) {
  const page = Number.isFinite(opts.page) && opts.page >= 1 ? Math.floor(opts.page) : 1;
  const pageSize =
    Number.isFinite(opts.pageSize) && opts.pageSize >= 1
      ? Math.min(100, Math.floor(opts.pageSize))
      : 25;
  const skip = (page - 1) * pageSize;

  const dateFrom = parseDate(opts.dateFrom);
  const dateTo = parseDate(opts.dateTo);
  const actorId =
    opts.actorId != null && Number.isFinite(Number(opts.actorId)) ? Number(opts.actorId) : null;
  const search = opts.search?.trim() || null;
  const source = opts.source && opts.source !== 'all' ? opts.source : 'all';
  const extendedFilters = {
    module: opts.module && opts.module !== 'all' ? opts.module : null,
    actionType: opts.actionType && opts.actionType !== 'all' ? opts.actionType : null,
    severity: opts.severity && opts.severity !== 'all' ? opts.severity : null,
    status: opts.status && opts.status !== 'all' ? opts.status : null,
  };

  const filterOpts = { dateFrom, dateTo, actorId, search, status: extendedFilters.status };
  const activeSources = resolveActiveSources(source, extendedFilters.module);

  if (!activeSources.length) {
    return { page, pageSize, total: 0, totalCount: 0, results: [] };
  }

  const needsPostFilter =
    extendedFilters.actionType || extendedFilters.severity ||
    (extendedFilters.status && activeSources.length > 1);

  if (source !== 'all' && !needsPostFilter && !extendedFilters.module) {
    const handler = SOURCE_FETCHERS[source];
    const where = handler.buildWhere(filterOpts);
    let results = await handler.fetch(where, { take: pageSize * 3, skip: 0 });
    results = results.filter((e) => matchesExtendedFilters(e, extendedFilters));
    const total = results.length >= pageSize * 3 ? await handler.count(where) : results.length;
    return {
      page,
      pageSize,
      total,
      totalCount: total,
      results: results.slice(skip, skip + pageSize),
    };
  }

  const mergeLimit = Math.min(1000, (skip + pageSize) * 4);
  const batches = await Promise.all(
    activeSources.map((key) => {
      const handler = SOURCE_FETCHERS[key];
      return handler.fetch(handler.buildWhere(filterOpts), { take: mergeLimit, skip: 0 });
    }),
  );

  let merged = batches
    .flat()
    .filter((entry) => matchesExtendedFilters(entry, extendedFilters))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (search) merged = merged.filter((entry) => matchesSearch(entry, search));

  const total = merged.length;
  const results = merged.slice(skip, skip + pageSize);

  return { page, pageSize, total, totalCount: total, results };
}
