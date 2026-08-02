import {
  listUserLoginLogs,
  listTeacherActivity,
  listUpcomingDeadlines,
} from '../../services/institutionalOversight.service.js';

/** Parses a `YYYY-MM-DD` query param into a Date, or null. */
function parseDateParam(raw) {
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** GET /api/dean/reports/user-logins — faculty-scoped login history. */
export async function getDeanUserLogins(req, res, next) {
  try {
    const facultyId = Number(req.facultyId);
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Math.min(100, Number(req.query.pageSize ?? 20) || 20);
    const search = String(req.query.search ?? '').trim();
    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);
    const data = await listUserLoginLogs({ facultyId, page, pageSize, search, from, to });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

/** GET /api/dean/reports/teacher-activity — faculty-scoped teacher activity. */
export async function getDeanTeacherActivity(req, res, next) {
  try {
    const facultyId = Number(req.facultyId);
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : null;
    const search = String(req.query.search ?? '').trim();
    const results = await listTeacherActivity({ facultyId, departmentId, search });
    res.json({ results });
  } catch (e) {
    next(e);
  }
}

/** GET /api/dean/reports/upcoming-deadlines — faculty-scoped assignment/quiz due dates. */
export async function getDeanUpcomingDeadlines(req, res, next) {
  try {
    const facultyId = Number(req.facultyId);
    const days = Math.min(60, Number(req.query.days ?? 14) || 14);
    const results = await listUpcomingDeadlines({ facultyId, days, limit: 10 });
    res.json({ results });
  } catch (e) {
    next(e);
  }
}
