import { buildDeanReports } from '../../services/deanReports.service.js';

/**
 * GET /api/dean/reports
 * Comprehensive faculty-scoped reports for Faculty Deans.
 */
export async function getDeanReports(req, res, next) {
  try {
    const facultyId = Number(req.facultyId);
    const periodMonths = Number(req.query.period?.replace?.(/\D/g, '') ?? req.query.period ?? 6) || 6;
    const filters = {
      departmentId: req.query.departmentId ?? null,
      academicYearId: req.query.academicYearId ?? null,
      semesterId: req.query.semesterId ?? null,
    };

    const data = await buildDeanReports({ facultyId, periodMonths, filters });
    res.json(data);
  } catch (e) {
    next(e);
  }
}
