import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';
import { buildReport, REPORT_SCOPES } from '../../services/reports/buildReport.js';
import { parseReportWindow } from '../../services/reports/dateWindow.js';
import { listSubjects } from '../../services/reports/listSubjects.js';
import { listReport, filterReportListRows } from '../../services/reports/listReport.js';

const router = Router();

const reportStaff = requireRole('SUPER_ADMIN', 'DEAN');

/**
 * GET /api/reports/:scope/list?period=
 *
 * Every subject in the scope as one row with its headline numbers — the
 * landing view, so a report opens showing all teachers (or courses, students,
 * batches, faculties) rather than an empty page and a picker.
 * Declared before `/:scope` so "list" isn't swallowed as an id.
 */
router.get('/:scope/list', reportStaff, async (req, res) => {
  const { scope } = req.params;
  if (!REPORT_SCOPES.includes(scope)) {
    return res
      .status(400)
      .json(apiErrorBody(`Unknown report scope "${scope}"`, { allowed: REPORT_SCOPES }));
  }
  try {
    const { since, until, months } = await parseReportWindow(req.query);
    let all = await listReport(scope, { since, until });

    const statusRaw = String(req.query.status ?? '').trim();
    // Batch lists default to ACTIVE unless the client asks for all / another status.
    if (scope === 'batch') {
      const status =
        !statusRaw || statusRaw === 'ACTIVE'
          ? 'ACTIVE'
          : statusRaw === 'all'
            ? ''
            : statusRaw;
      if (status) {
        all = all.filter((row) => row.status === status);
      }
    }

    const search = String(req.query.search ?? '').trim();
    const filtered = filterReportListRows(all, search);

    const sortKey = req.query.sort ? String(req.query.sort) : null;
    const desc = String(req.query.dir ?? 'asc') === 'desc';
    const sorted = sortKey
      ? [...filtered].sort((a, b) => {
          const av = a[sortKey];
          const bv = b[sortKey];
          const cmp =
            typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av ?? '').localeCompare(String(bv ?? ''));
          return desc ? -cmp : cmp;
        })
      : filtered;

    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const rows = sorted.slice((page - 1) * pageSize, page * pageSize);

    return res.json({
      scope,
      period: {
        months,
        since: since ? since.toISOString() : null,
        until: until ? until.toISOString() : null,
      },
      rows,
      page,
      pageSize,
      total: filtered.length,
      totalUnfiltered: all.length,
    });
  } catch (err) {
    const status = err?.status ?? 500;
    if (status >= 500) {
      console.error('[reports] list failed', { scope, message: err?.message });
    }
    return res
      .status(status)
      .json(apiErrorBody(status >= 500 ? 'Failed to build report list' : err.message, null));
  }
});

/**
 * GET /api/reports/:scope/subjects?search=
 * The pickable subjects for a scope, already shaped for a dropdown.
 * Declared before `/:scope` so "subjects" isn't swallowed as an id.
 */
router.get('/:scope/subjects', reportStaff, async (req, res) => {
  const { scope } = req.params;
  if (!REPORT_SCOPES.includes(scope)) {
    return res
      .status(400)
      .json(apiErrorBody(`Unknown report scope "${scope}"`, { allowed: REPORT_SCOPES }));
  }
  try {
    return res.json({
      scope,
      subjects: await listSubjects(scope, req.query.search),
    });
  } catch (err) {
    const status = err?.status ?? 500;
    if (status >= 500) {
      console.error('[reports] subjects failed', { scope, message: err?.message });
    }
    return res
      .status(status)
      .json(apiErrorBody(status >= 500 ? 'Failed to load report subjects' : err.message, null));
  }
});

/**
 * GET /api/reports/:scope?id=<subject>&period=<months>
 *
 * One endpoint for every report — course, teacher, student, batch, faculty —
 * because they differ only in which course offerings and people they cover.
 */
router.get('/:scope', reportStaff, async (req, res) => {
  const { scope } = req.params;
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  if (!REPORT_SCOPES.includes(scope)) {
    return res
      .status(400)
      .json(apiErrorBody(`Unknown report scope "${scope}"`, { allowed: REPORT_SCOPES }));
  }
  if (!id) {
    return res.status(400).json(apiErrorBody('Missing ?id= for the report subject', null));
  }

  try {
    const { since, until, months } = await parseReportWindow(req.query);
    const report = await buildReport({ scope, id, since, until, months });
    // Prisma Decimals / Dates / stray BigInts must not blow up res.json.
    const payload = JSON.parse(
      JSON.stringify(report, (_key, value) => (typeof value === 'bigint' ? Number(value) : value))
    );
    return res.json(payload);
  } catch (err) {
    const status = err?.status ?? 500;
    console.error('[reports] build failed', {
      scope,
      id,
      query: req.query,
      userId: req.user?.sub ?? req.user?.id,
      role: req.user?.role,
      status,
      message: err?.message,
      stack: err?.stack,
    });
    return res.status(status).json(
      apiErrorBody(
        status >= 500
          ? `Failed to build report${err?.message ? `: ${err.message}` : ''}`
          : err.message,
        { reason: err?.message ?? null }
      )
    );
  }
});

export default router;
