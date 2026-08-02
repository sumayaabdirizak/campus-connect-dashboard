import { prisma } from '../../db/prisma.js';

/**
 * Deans only see/act on academic rows in their assigned faculty.
 * SUPER_ADMIN and other roles use unrestricted list access.
 * @returns {{ mode: 'all' } | { mode: 'none' } | { mode: 'faculty', facultyId: number }}
 */
export async function facultyScopeForRestrictedAcademicRoles(req) {
  const role = String(req.user?.role || '');
  if (role === 'SUPER_ADMIN') return { mode: 'all' };
  if (role !== 'DEAN') return { mode: 'all' };

  let fid = req.user?.facultyId ?? req.user?.faculty_id;
  const uid = Number(req.user?.sub ?? req.user?.id ?? 0);
  if ((fid == null || fid === '') && uid > 0) {
    const d = await prisma.deanProfile.findUnique({
      where: { userId: uid },
      select: { facultyId: true }
    });
    fid = d?.facultyId ?? null;
  }
  const n = fid == null || fid === '' ? null : Number(fid);
  if (n == null || !Number.isFinite(n) || n <= 0) {
    return { mode: 'none' };
  }
  return { mode: 'faculty', facultyId: n };
}

/** Prisma `where` fragment for Program rows scoped to a faculty (via department). */
export function programWhereForFacultyScope(scope) {
  if (scope.mode === 'faculty') {
    return { department: { facultyId: scope.facultyId } };
  }
  if (scope.mode === 'none') {
    return { department: { facultyId: -1 } };
  }
  return {};
}
