import { listPlatformAuditLogs, getPlatformAuditStats, listAuditActors } from '../../services/platformAuditLogs.service.js';

export async function getAdminAuditLogs(req, res, next) {
  try {
    const actorIdRaw = req.query?.actorId;
    const actorId =
      actorIdRaw != null && actorIdRaw !== '' ? Number(actorIdRaw) : null;

    if (actorId != null && (!Number.isFinite(actorId) || actorId <= 0)) {
      return res.status(400).json({ message: 'Invalid actorId' });
    }

    const pageRaw = Number(req.query?.page ?? 1);
    const pageSizeRaw = Number(req.query?.pageSize ?? req.query?.limit ?? 25);

    const data = await listPlatformAuditLogs({
      source: req.query?.source ?? 'all',
      module: req.query?.module ?? 'all',
      actionType: req.query?.actionType ?? 'all',
      severity: req.query?.severity ?? 'all',
      status: req.query?.status ?? 'all',
      page: pageRaw,
      pageSize: pageSizeRaw,
      dateFrom: req.query?.dateFrom ?? null,
      dateTo: req.query?.dateTo ?? null,
      actorId,
      search: req.query?.search ?? req.query?.q ?? null,
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function getAdminAuditStats(req, res, next) {
  try {
    const stats = await getPlatformAuditStats();
    res.json(stats);
  } catch (e) {
    next(e);
  }
}

export async function getAdminAuditActors(req, res, next) {
  try {
    const results = await listAuditActors();
    res.json({ results });
  } catch (e) {
    next(e);
  }
}
