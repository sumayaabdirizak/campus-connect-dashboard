import { DISCUSSION_CONTEXT_ROLES } from "../../policy.js";

export async function getDepartmentDefaultMembers(tx, scopeId) {
  const members = [];
  const department = await tx.department.findUnique({
    where: { id: scopeId },
    select: {
      headUserId: true,
      faculty: { select: { deanProfile: { select: { userId: true } } } },
    },
  });
  const lecturers = await tx.lecturerProfile.findMany({
    where: { departmentId: scopeId },
    select: { userId: true },
  });

  if (department?.faculty?.deanProfile?.userId) {
    members.push({
      userId: department.faculty.deanProfile.userId,
      role: DISCUSSION_CONTEXT_ROLES.DEAN,
    });
  }
  if (department?.headUserId) {
    members.push({
      userId: department.headUserId,
      role: DISCUSSION_CONTEXT_ROLES.HEAD,
    });
  }
  for (const lecturer of lecturers) {
    members.push({
      userId: lecturer.userId,
      role: DISCUSSION_CONTEXT_ROLES.LECTURER,
    });
  }
  return members;
}
