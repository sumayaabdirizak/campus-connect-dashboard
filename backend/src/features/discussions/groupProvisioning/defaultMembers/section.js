import { DISCUSSION_CONTEXT_ROLES } from "../../policy.js";

export async function getSectionDefaultMembers(tx, scopeId) {
  const members = [];
  const section = await tx.batchSection.findUnique({
    where: { id: scopeId },
    select: { moderatorUserId: true },
  });

  const [studentRows, offerings] = await Promise.all([
    tx.studentRegistration.findMany({
      where: { batchSectionId: scopeId },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
    tx.courseOffering.findMany({
      where: { sectionId: scopeId, teacherId: { not: null } },
      select: { id: true, teacherId: true },
      orderBy: { id: "asc" },
    }),
  ]);

  for (const row of studentRows) {
    members.push({ userId: row.studentId, role: DISCUSSION_CONTEXT_ROLES.STUDENT });
  }

  const teacherIds = [];
  const seen = new Set();
  for (const off of offerings) {
    if (off.teacherId && !seen.has(off.teacherId)) {
      seen.add(off.teacherId);
      teacherIds.push(off.teacherId);
    }
  }

  let moderatorId = section?.moderatorUserId ?? null;
  if (!moderatorId && teacherIds.length > 0) {
    moderatorId = teacherIds[0];
  }

  if (moderatorId) {
    members.push({ userId: moderatorId, role: DISCUSSION_CONTEXT_ROLES.HEAD });
  }
  for (const tid of teacherIds) {
    if (tid !== moderatorId) {
      members.push({ userId: tid, role: DISCUSSION_CONTEXT_ROLES.LECTURER });
    }
  }
  return members;
}
