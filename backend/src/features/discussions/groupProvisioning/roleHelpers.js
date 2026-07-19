import { DISCUSSION_CONTEXT_ROLES } from "../policy.js";

export function mapGlobalRoleToDiscussionRole(globalRoleName) {
  switch (String(globalRoleName || "").toUpperCase()) {
    case "DEAN":
      return DISCUSSION_CONTEXT_ROLES.DEAN;
    case "TEACHER":
      return DISCUSSION_CONTEXT_ROLES.LECTURER;
    case "FACULTY_ADMIN":
    case "SUPER_ADMIN":
      return DISCUSSION_CONTEXT_ROLES.ADMIN;
    case "STUDENT":
      return DISCUSSION_CONTEXT_ROLES.STUDENT;
    default:
      return null;
  }
}

export const MEMBER_ROLE_PRIORITY = {
  [DISCUSSION_CONTEXT_ROLES.DEAN]: 60,
  [DISCUSSION_CONTEXT_ROLES.HEAD]: 50,
  [DISCUSSION_CONTEXT_ROLES.ADMIN]: 45,
  [DISCUSSION_CONTEXT_ROLES.ADVISOR]: 40,
  [DISCUSSION_CONTEXT_ROLES.LECTURER]: 30,
  [DISCUSSION_CONTEXT_ROLES.STUDENT]: 10,
};

export function mergeMembersByHighestRole(members) {
  const map = new Map();
  for (const member of members) {
    const key = String(member.userId);
    const prev = map.get(key);
    const nextWeight = MEMBER_ROLE_PRIORITY[member.role] ?? 0;
    const prevWeight = prev ? MEMBER_ROLE_PRIORITY[prev.role] ?? 0 : -1;
    if (!prev || nextWeight > prevWeight) {
      map.set(key, member);
    }
  }
  return [...map.values()];
}
