import { prisma } from '../../db/prisma.js';
import {
  buildPlatformAnalytics,
  parsePeriodMonths,
} from '../../services/platformAnalytics.service.js';
import {
  listUserLoginLogs,
  listTeacherActivity,
  listUpcomingDeadlines,
} from '../../services/institutionalOversight.service.js';

function parseOptionalFacultyId(raw) {
  if (raw == null || raw === '' || raw === 'all') return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Parses a `YYYY-MM-DD` query param into a Date, or null. */
function parseDateParam(raw) {
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** GET /api/admin/reports/user-logins — platform-wide (or single-faculty) login history. */
export async function getAdminUserLogins(req, res, next) {
  try {
    const facultyId = parseOptionalFacultyId(req.query.facultyId);
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

/** GET /api/admin/reports/teacher-activity — platform-wide (or single-faculty) teacher activity. */
export async function getAdminTeacherActivity(req, res, next) {
  try {
    const facultyId = parseOptionalFacultyId(req.query.facultyId);
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : null;
    const search = String(req.query.search ?? '').trim();
    const results = await listTeacherActivity({ facultyId, departmentId, search });
    res.json({ results });
  } catch (e) {
    next(e);
  }
}

/** GET /api/admin/reports/upcoming-deadlines — platform-wide (or single-faculty) deadlines. */
export async function getAdminUpcomingDeadlines(req, res, next) {
  try {
    const facultyId = parseOptionalFacultyId(req.query.facultyId);
    const days = Math.min(60, Number(req.query.days ?? 14) || 14);
    const results = await listUpcomingDeadlines({ facultyId, days, limit: 10 });
    res.json({ results });
  } catch (e) {
    next(e);
  }
}

export async function getAdminAnalytics(req, res, next) {
  try {
    const facultyIdRaw = req.query?.facultyId;
    const facultyId =
      facultyIdRaw != null && facultyIdRaw !== '' && facultyIdRaw !== 'all'
        ? Number(facultyIdRaw)
        : null;

    if (facultyId != null && (!Number.isFinite(facultyId) || facultyId <= 0)) {
      return res.status(400).json({ message: 'Invalid facultyId' });
    }

    if (facultyId != null) {
      const exists = await prisma.faculty.findUnique({
        where: { id: facultyId },
        select: { id: true },
      });
      if (!exists) return res.status(404).json({ message: 'Faculty not found' });
    }

    const periodMonths = parsePeriodMonths(req.query?.period);
    const data = await buildPlatformAnalytics({ facultyId, periodMonths });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function listAdminFaculties(req, res, next) {
  try {
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    res.json({ results: faculties });
  } catch (e) {
    next(e);
  }
}
