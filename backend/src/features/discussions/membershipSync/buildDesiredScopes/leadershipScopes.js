import { DISCUSSION_CONTEXT_ROLES, DISCUSSION_SCOPE_TYPES } from "../../policy.js";
import { addDesiredRole } from "../helpers.js";

export async function applyLeadershipScopes(tx, user, desiredByScope) {
  const departmentsAsHead = await tx.department.findMany({
    where: { headUserId: user.id },
    select: { id: true },
  });
  for (const d of departmentsAsHead) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      d.id,
      DISCUSSION_CONTEXT_ROLES.HEAD
    );
  }

  const batchesAsAdvisor = await tx.batch.findMany({
    where: { advisorUserId: user.id },
    select: { id: true },
  });
  for (const b of batchesAsAdvisor) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.BATCH,
      b.id,
      DISCUSSION_CONTEXT_ROLES.HEAD
    );
  }

  const sectionsAsModerator = await tx.batchSection.findMany({
    where: { moderatorUserId: user.id },
    select: { id: true },
  });
  for (const s of sectionsAsModerator) {
    addDesiredRole(
      desiredByScope,
      DISCUSSION_SCOPE_TYPES.SECTION,
      s.id,
      DISCUSSION_CONTEXT_ROLES.HEAD
    );
  }
}
