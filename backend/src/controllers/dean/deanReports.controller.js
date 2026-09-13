import { buildDeanReports } from '../../services/deanReports.service.js';
import {
  isAllTimePeriod,
  isSemesterPeriod,
} from '../../services/academic/resolveActiveSemesterWindow.js';

/**
 * GET /api/dean/reports
 * Comprehensive faculty-scoped reports for Faculty Deans.
 */
export async function getDeanReports(req, res, next) {
  try {
    const facultyId = Number(req.facultyId);
    const rawPeriod = String(req.query.period ?? 'semester').trim();
    const period = isSemesterPeriod(rawPeriod)
      ? 'semester'
      : isAllTimePeriod(rawPeriod)
        ? 'all'
        : String(rawPeriod).toLowerCase() === 'custom'
          ? 'custom'
          : rawPeriod;
    const periodMonths =
      period === 'semester' || period === 'all' || period === 'custom'
        ? period
        : Number(rawPeriod.replace(/\D/g, '') || 6) || 6;

    const from = req.query.from ? String(req.query.from).slice(0, 10) : null;
    const to = req.query.to ? String(req.query.to).slice(0, 10) : null;

    const filters = {
      departmentId: req.query.departmentId || null,
      batchId: req.query.batchId || null,
      sectionId: req.query.sectionId || null,
      academicYearId: req.query.academicYearId || null,
      semesterId: req.query.semesterId || null,
      studentLevel: req.query.studentLevel || null,
      status: req.query.status || null,
    };

    const data = await buildDeanReports({
      facultyId,
      period,
      periodMonths,
      from,
      to,
      filters,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}
