import {
  PERMISSION_ADMINISTRATOR,
  PERMISSION_ALL,
  SYSTEM_ROLE_DEFAULTS,
  SYSTEM_ROLE_KEYS,
} from "./constants.js";
import { mapClubMembershipRoleToSystemKey, mapGlobalRoleToSystemRoleKey } from "./roleMapping.js";

export function resolveUserSystemKey({ serverKind, globalRole, membership }) {
  const isClubServer = serverKind === "USER_SERVER";
  if (isClubServer) {
    return membership?.role && membership.isActive !== false
      ? mapClubMembershipRoleToSystemKey(membership.role)
      : null;
  }
  return mapGlobalRoleToSystemRoleKey(globalRole);
}

export function computeBasePermissions({ systemRoles, userSystemKey }) {
  const everyone = systemRoles.find((r) => r.systemKey === SYSTEM_ROLE_KEYS.EVERYONE);
  let perms = everyone
    ? BigInt(everyone.permissions)
    : SYSTEM_ROLE_DEFAULTS[SYSTEM_ROLE_KEYS.EVERYONE];

  if (userSystemKey && userSystemKey !== SYSTEM_ROLE_KEYS.EVERYONE) {
    const r = systemRoles.find((sr) => sr.systemKey === userSystemKey);
    if (r) perms |= BigInt(r.permissions);
    else if (SYSTEM_ROLE_DEFAULTS[userSystemKey] != null)
      perms |= SYSTEM_ROLE_DEFAULTS[userSystemKey];
  }

  return { everyone, perms };
}

export function buildEffectiveRoleIds({ everyone, systemRoles, userSystemKey }) {
  const effectiveRoleIds = new Set();
  if (everyone) effectiveRoleIds.add(everyone.id);
  if (userSystemKey) {
    const r = systemRoles.find((sr) => sr.systemKey === userSystemKey);
    if (r) effectiveRoleIds.add(r.id);
  }
  return effectiveRoleIds;
}

export function applyRoleOverwrites(basePerms, roleOverwrites, effectiveRoleIds) {
  let allowMask = 0n;
  let denyMask = 0n;
  for (const o of roleOverwrites) {
    if (!effectiveRoleIds.has(o.targetId)) continue;
    denyMask |= BigInt(o.deny);
    allowMask |= BigInt(o.allow);
  }
  return (basePerms & ~denyMask) | allowMask;
}

export function applyMemberOverwrites(perms, memberOverwrites) {
  let mDeny = 0n;
  let mAllow = 0n;
  for (const o of memberOverwrites) {
    mDeny |= BigInt(o.deny);
    mAllow |= BigInt(o.allow);
  }
  return (perms & ~mDeny) | mAllow;
}

export function shortCircuitIfAdmin({ globalRole, ownerId, userId, perms }) {
  if (globalRole === "SUPER_ADMIN") return PERMISSION_ALL;
  if (ownerId === userId) return PERMISSION_ALL;
  if ((perms & PERMISSION_ADMINISTRATOR) !== 0n) return PERMISSION_ALL;
  return null;
}
