import { DISCUSSION_CONTEXT_ROLES } from "../../policy.js";

export async function getFacultyDefaultMembers(tx, scopeId) {
  const members = [];
  const [deanProfile, lecturerAffiliates, deptLecturers] = await Promise.all([
    tx.deanProfile.findFirst({
      where: { facultyId: scopeId },
      select: { userId: true },
    }),
    tx.lecturerFaculty.findMany({
      where: { facultyId: scopeId },
      select: { lecturerProfile: { select: { userId: true } } },
    }),
    tx.lecturerProfile.findMany({
      where: { department: { facultyId: scopeId } },
      select: { userId: true },
    }),
  ]);

  if (deanProfile?.userId) {
    members.push({ userId: deanProfile.userId, role: DISCUSSION_CONTEXT_ROLES.DEAN });
  }
  for (const row of lecturerAffiliates) {
    if (row.lecturerProfile?.userId) {
      members.push({
        userId: row.lecturerProfile.userId,
        role: DISCUSSION_CONTEXT_ROLES.LECTURER,
      });
    }
  }
  for (const lec of deptLecturers) {
    members.push({ userId: lec.userId, role: DISCUSSION_CONTEXT_ROLES.LECTURER });
  }
  return members;
}
