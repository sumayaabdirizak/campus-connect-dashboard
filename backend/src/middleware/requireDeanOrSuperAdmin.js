import { prisma } from '../db/prisma.js';
import { apiErrorBody } from '../utils/apiEnvelope.js';

/**
 * Like requireDean, but also lets SUPER_ADMIN through — for report/analytics
 * endpoints a Super Admin should be able to view too, scoped to any faculty
 * they choose via ?facultyId=.
 *
 * - DEAN: req.facultyId is forced to their own DeanProfile.facultyId (cannot
 *   be overridden via query — same scoping guarantee as requireDean).
 * - SUPER_ADMIN: req.facultyId comes from ?facultyId= (number) or null for
 *   an all-faculties view, when the endpoint supports that.
 */
export const requireDeanOrSuperAdmin = async (req, res, next) => {
  const role = req.user?.role;

  if (role === 'DEAN') {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId: req.user.sub },
    });
    if (!deanProfile) {
      return res.status(403).json(apiErrorBody('No faculty assignment found for this Dean.', null));
    }
    req.facultyId = deanProfile.facultyId;
    return next();
  }

  if (role === 'SUPER_ADMIN') {
    const rawFacultyId = req.query.facultyId;
    req.facultyId = rawFacultyId ? Number(rawFacultyId) : null;
    if (rawFacultyId && !Number.isInteger(req.facultyId)) {
      return res.status(400).json(apiErrorBody('Invalid facultyId.', null));
    }
    return next();
  }

  return res.status(403).json(apiErrorBody('Access restricted to Deans and Super Admins.', null));
};
