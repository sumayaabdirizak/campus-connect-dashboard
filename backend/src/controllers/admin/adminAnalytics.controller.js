import { prisma } from '../../db/prisma.js';
import {
  buildPlatformAnalytics,
  parsePeriodMonths,
} from '../../services/platformAnalytics.service.js';

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
