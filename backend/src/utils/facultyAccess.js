/** Primary faculty from JWT (Dean or first affiliated faculty for teachers). */
export function getAuthFacultyId(user) {
  if (!user) return null;
  const v = user.facultyId ?? user.faculty_id;
  return v == null || v === "" ? null : Number(v);
}
