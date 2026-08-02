import { DISCUSSION_SCOPE_TYPES } from "../policy.js";

export async function resolveParentFacultyId(tx, scopeType, scopeId) {
  if (scopeType === DISCUSSION_SCOPE_TYPES.FACULTY) return scopeId;
  if (scopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
    const row = await tx.department.findUnique({
      where: { id: scopeId },
      select: { facultyId: true },
    });
    return row?.facultyId ?? null;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.BATCH) {
    const row = await tx.batch.findUnique({
      where: { id: scopeId },
      select: { program: { select: { department: { select: { facultyId: true } } } } },
    });
    return row?.program?.department?.facultyId ?? null;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.SECTION) {
    const row = await tx.batchSection.findUnique({
      where: { id: scopeId },
      select: {
        batch: {
          select: { program: { select: { department: { select: { facultyId: true } } } } },
        },
      },
    });
    return row?.batch?.program?.department?.facultyId ?? null;
  }
  return null;
}
