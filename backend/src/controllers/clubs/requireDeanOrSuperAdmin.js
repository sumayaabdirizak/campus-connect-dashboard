import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';
import { isCrossFacultyAdmin } from '../../../../shared/roles.js';

/** Dean / academic office / super-admin middleware. Populates req.facultyId for deans. */
export async function requireDeanOrSuperAdmin(req, res, next) {
  const role = req.user?.role;
  if (isCrossFacultyAdmin(role)) return next();
  if (role === 'DEAN') {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId: Number(req.user.id ?? req.user.sub) },
      select: { facultyId: true },
    });
    if (!deanProfile) {
      return res.status(403).json(apiErrorBody('No faculty assignment found'));
    }
    req.facultyId = deanProfile.facultyId;
    return next();
  }
  return res.status(403).json(apiErrorBody('Access restricted to Deans and Academic leadership'));
}
