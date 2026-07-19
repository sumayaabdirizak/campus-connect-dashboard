import { DISCUSSION_CONTEXT_ROLES, DISCUSSION_SCOPE_TYPES } from "../policy.js";

export function validAcademicId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0;
}

const ROLE_PRIORITY = {
  [DISCUSSION_CONTEXT_ROLES.DEAN]: 60,
  [DISCUSSION_CONTEXT_ROLES.HEAD]: 50,
  [DISCUSSION_CONTEXT_ROLES.ADMIN]: 45,
  [DISCUSSION_CONTEXT_ROLES.ADVISOR]: 40,
  [DISCUSSION_CONTEXT_ROLES.LECTURER]: 30,
  [DISCUSSION_CONTEXT_ROLES.STUDENT]: 10,
};

export function withHigherRole(currentRole, candidateRole) {
  if (!currentRole) return candidateRole;
  const currentWeight = ROLE_PRIORITY[currentRole] ?? 0;
  const candidateWeight = ROLE_PRIORITY[candidateRole] ?? 0;
  return candidateWeight > currentWeight ? candidateRole : currentRole;
}

export function scopeKey(scopeType, scopeId) {
  return `${scopeType}:${scopeId}`;
}

export function toScopeTuple(scopeKeyValue) {
  const [scopeType, id] = scopeKeyValue.split(":");
  return { scopeType, scopeId: Number(id) };
}

export async function resolveScopeDisplayName(tx, scopeType, scopeId) {
  if (scopeType === DISCUSSION_SCOPE_TYPES.FACULTY) {
    const row = await tx.faculty.findUnique({ where: { id: scopeId }, select: { name: true } });
    return row?.name ?? `Faculty ${scopeId}`;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
    const row = await tx.department.findUnique({ where: { id: scopeId }, select: { name: true } });
    return row?.name ?? `Department ${scopeId}`;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.BATCH) {
    const row = await tx.batch.findUnique({ where: { id: scopeId }, select: { name: true } });
    return row?.name ?? `Batch ${scopeId}`;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.SECTION) {
    const row = await tx.batchSection.findUnique({ where: { id: scopeId }, select: { name: true } });
    return row?.name ?? `Section ${scopeId}`;
  }
  return `Group ${scopeType} ${scopeId}`;
}

export function addDesiredRole(desiredByScope, scopeType, scopeId, role) {
  const key = scopeKey(scopeType, scopeId);
  const existingRole = desiredByScope.get(key);
  desiredByScope.set(key, withHigherRole(existingRole, role));
}
