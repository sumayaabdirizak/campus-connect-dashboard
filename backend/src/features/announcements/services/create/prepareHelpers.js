import { resolveOfficeStaffDmScope } from '../../../discussions/officeStaffDmScope.js';

/** @param {object} parsed @returns {{ scopeType: string; scopeId: number }[]} */
export function parseExtraTargetsFromParsed(parsed) {
  return Array.isArray(parsed.targets)
    ? parsed.targets
        .map((t) => ({
          scopeType: String(t?.scopeType ?? '').toUpperCase(),
          scopeId: Number(t?.scopeId),
        }))
        .filter(
          (t) =>
            ['FACULTY', 'DEPARTMENT', 'BATCH', 'SECTION'].includes(t.scopeType) &&
            Number.isFinite(t.scopeId)
        )
    : [];
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} role
 * @param {number} userId
 * @param {object} parsed
 */
export async function resolveCreatorFacultyScope(prisma, role, userId, parsed) {
  const r = String(role || '').toUpperCase();

  if (r === 'DEAN') {
    const dean = await prisma.deanProfile.findUnique({
      where: { userId },
      select: { facultyId: true },
    });
    if (!dean) {
      return { ok: false, status: 403, message: 'Dean profile not found' };
    }
    return {
      ok: true,
      facultyIdForTargeting: dean.facultyId,
      facultyScope: dean.facultyId,
      facultyScoped: true,
    };
  }

  if (r === 'OFFICE_STAFF') {
    const desk = await resolveOfficeStaffDmScope(userId, prisma);
    if (desk.kind === 'none') {
      return {
        ok: false,
        status: 403,
        message: 'You must be assigned to an office desk to create announcements',
      };
    }
    if (desk.kind === 'faculty') {
      const fid = desk.facultyIds[0];
      return {
        ok: true,
        facultyIdForTargeting: fid,
        facultyScope: fid,
        facultyScoped: true,
      };
    }
    return {
      ok: true,
      facultyIdForTargeting: parsed.facultyId ?? null,
      facultyScope: undefined,
      facultyScoped: false,
    };
  }

  return {
    ok: true,
    facultyIdForTargeting: parsed.facultyId ?? null,
    facultyScope: undefined,
    facultyScoped: false,
  };
}
