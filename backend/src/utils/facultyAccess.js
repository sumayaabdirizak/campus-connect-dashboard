import { prisma } from "../db/prisma.js";

/** Primary faculty from JWT (Dean, Faculty Admin, or first affiliated faculty for teachers). */
export function getAuthFacultyId(user) {
  if (!user) return null;
  const v = user.facultyId ?? user.faculty_id;
  return v == null || v === "" ? null : Number(v);
}

/**
 * Load faculty id for FACULTY_ADMIN JWT enrichment (login/refresh).
 */
export async function getFacultyIdForFacultyAdminUser(userId) {
  const row = await prisma.facultyAdminProfile.findUnique({
    where: { user_id: userId },
    select: { faculty_id: true },
  });
  return row?.faculty_id ?? null;
}
