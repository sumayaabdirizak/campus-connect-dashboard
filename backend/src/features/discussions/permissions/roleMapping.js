import { SYSTEM_ROLE_KEYS } from "./constants.js";

export function mapGlobalRoleToSystemRoleKey(globalRoleName) {
  const r = String(globalRoleName || "").toUpperCase();
  switch (r) {
    case "STUDENT":
      return SYSTEM_ROLE_KEYS.STUDENT;
    case "TEACHER":
    case "LECTURER":
      return SYSTEM_ROLE_KEYS.LECTURER;
    case "DEAN":
      return SYSTEM_ROLE_KEYS.DEAN;
    case "FACULTY_ADMIN":
      return SYSTEM_ROLE_KEYS.FACULTY_ADMIN;
    case "SUPER_ADMIN":
      return SYSTEM_ROLE_KEYS.FACULTY_ADMIN;
    default:
      return null;
  }
}

export function mapClubMembershipRoleToSystemKey(membershipRole) {
  const r = String(membershipRole || "").toUpperCase();
  switch (r) {
    case "ADMIN":
    case "HEAD":
    case "DEAN":
      return "MODERATOR";
    case "STUDENT":
    case "LECTURER":
    case "ADVISOR":
      return "MEMBER";
    default:
      return "MEMBER";
  }
}
