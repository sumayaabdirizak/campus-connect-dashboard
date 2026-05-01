import { prisma } from '../db/prisma.js';
import { apiErrorBody } from "../utils/apiEnvelope.js";

/**
 * requireDean middleware
 * - Verifies the authenticated user has the DEAN role
 * - Injects req.facultyId from their DeanProfile (scope enforcement)
 */
export const requireDean = async (req, res, next) => {
  const role = req.user?.role;

  if (role !== 'DEAN') {
    return res.status(403).json(apiErrorBody('Access restricted to Deans only.', null));
  }

  const deanProfile = await prisma.deanProfile.findUnique({
    where: { userId: req.user.sub }
  });

  if (!deanProfile) {
    return res.status(403).json(apiErrorBody('No faculty assignment found for this Dean.', null));
  }

  req.facultyId = deanProfile.facultyId;
  next();
};
