import { prisma } from '../../../db/prisma.js';
import { isStudentRole } from '../../../../../shared/roles.js';

/**
 * Student's faculty for office contact (Dean’s Office + university desks).
 * @param {number} userId
 * @returns {Promise<number | null>}
 */
export async function loadStudentFacultyId(userId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: Number(userId) },
    select: { facultyId: true },
  });
  const fid = Number(profile?.facultyId);
  return Number.isFinite(fid) && fid > 0 ? fid : null;
}

/**
 * Prisma where clause: university desks OR this faculty's Dean’s Office.
 * @param {number | null} facultyId
 */
export function studentContactableOfficeWhere(facultyId) {
  if (facultyId == null) {
    return { facultyId: null };
  }
  return {
    OR: [{ facultyId: null }, { facultyId }],
  };
}

/**
 * Students may only ticket university desks or their own faculty Dean’s Office.
 * @returns {Promise<{ ok: true } | { ok: false, status: number, message: string }>}
 */
export async function assertStudentMayContactOffice(req, office) {
  if (!isStudentRole(req.user?.role)) return { ok: true };

  const facultyId = await loadStudentFacultyId(Number(req.user.sub));
  const officeFacultyId =
    office.facultyId == null ? null : Number(office.facultyId);

  if (officeFacultyId == null) return { ok: true };
  if (facultyId != null && officeFacultyId === facultyId) return { ok: true };

  return {
    ok: false,
    status: 403,
    message: 'You can only contact university offices or your faculty Dean’s Office',
  };
}
