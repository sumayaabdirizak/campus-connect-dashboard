import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';

/** Combined dean / super-admin middleware. Populates req.facultyId for deans. */
export async function requireDeanOrSuperAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === 'SUPER_ADMIN') return next();
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
  return res.status(403).json(apiErrorBody('Access restricted to Deans and Super Admins'));
}
