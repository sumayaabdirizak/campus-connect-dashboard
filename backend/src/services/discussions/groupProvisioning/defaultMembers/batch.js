import { DISCUSSION_CONTEXT_ROLES } from "../../policy.js";

export async function getBatchDefaultMembers(tx, scopeId) {
  const members = [];
  const batch = await tx.batch.findUnique({
    where: { id: scopeId },
    select: {
      advisorUserId: true,
      program: {
        select: {
          department: {
            select: {
              faculty: { select: { deanProfile: { select: { userId: true } } } },
            },
          },
        },
      },
    },
  });

  if (batch?.program?.department?.faculty?.deanProfile?.userId) {
    members.push({
      userId: batch.program.department.faculty.deanProfile.userId,
      role: DISCUSSION_CONTEXT_ROLES.DEAN,
    });
  }
  if (batch?.advisorUserId) {
    members.push({
      userId: batch.advisorUserId,
      role: DISCUSSION_CONTEXT_ROLES.HEAD,
    });
  }

  const [studentRows, offeringTeachers] = await Promise.all([
    tx.studentRegistration.findMany({
      where: { batchSection: { batchId: scopeId } },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
    tx.courseOffering.findMany({
      where: {
        section: { batchId: scopeId },
        teacherId: { not: null },
      },
      select: { teacherId: true },
      distinct: ["teacherId"],
    }),
  ]);

  for (const row of studentRows) {
    members.push({ userId: row.studentId, role: DISCUSSION_CONTEXT_ROLES.STUDENT });
  }
  for (const row of offeringTeachers) {
    if (row.teacherId) {
      members.push({
        userId: row.teacherId,
        role: DISCUSSION_CONTEXT_ROLES.LECTURER,
      });
    }
  }
  return members;
}
