import { ANNOUNCEMENT_TARGET_ROLE_OPTIONS, DEAN_ALLOWED_TARGET_ROLES } from "./constants.js";

/**
 * Default audience when the client omits `targetRoles`.
 * @param {string} creatorRole
 * @param {boolean} [facultyScoped]
 * @returns {string[]}
 */
export function defaultTargetRolesForCreator(creatorRole, facultyScoped = false) {
  const r = String(creatorRole ?? "").toUpperCase();
  if (r === "DEAN" || facultyScoped) {
    return ["STUDENT", "TEACHER"];
  }
  return [
    "STUDENT",
    "TEACHER",
    "ADMIN",
    "DEAN",
    "SUPER_ADMIN",
    "ACADEMIC_OFFICE",
    "OFFICE_STAFF",
  ];
}

/** @param {unknown} input @returns {string[]} */
export function normalizeTargetRoles(input) {
  const list = Array.isArray(input) ? input : input != null ? [input] : [];
  const normalized = list
    .flatMap((item) => {
      if (typeof item !== "string") return [];
      const trimmed = item.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [trimmed];
        } catch {
          return [trimmed];
        }
      }
      return [trimmed];
    })
    .map((item) => String(item).toUpperCase())
    .map((item) => (item === "LECTURER" ? "TEACHER" : item))
    .filter((item) => ANNOUNCEMENT_TARGET_ROLE_OPTIONS.has(item));
  return Array.from(new Set(normalized));
}

/**
 * Faculty-scoped publishers (Dean, Dean's Office staff): STUDENT / TEACHER only.
 * @param {boolean} facultyScoped
 * @param {string[]} targetRoles
 */
export function validateFacultyScopedTargetRoles(facultyScoped, targetRoles) {
  if (!facultyScoped) return { ok: true };
  const disallowed = targetRoles.filter((r) => !DEAN_ALLOWED_TARGET_ROLES.has(r));
  if (disallowed.length > 0) {
    return {
      ok: false,
      status: 400,
      message: "Faculty publishers can only target STUDENT and TEACHER users",
    };
  }
  return { ok: true };
}

/** @param {string} role @param {string[]} targetRoles */
export function validateDeanTargetRoles(role, targetRoles) {
  return validateFacultyScopedTargetRoles(String(role).toUpperCase() === "DEAN", targetRoles);
}

/**
 * Faculty-scoped publishers: DEPARTMENT / BATCH / SECTION only.
 * @param {boolean} facultyScoped
 * @param {string} targetType
 */
export function validateFacultyScopedTargetType(facultyScoped, targetType) {
  if (!facultyScoped) return { ok: true };
  if (!["DEPARTMENT", "BATCH", "SECTION"].includes(String(targetType).toUpperCase())) {
    return {
      ok: false,
      status: 400,
      message: "Faculty targetType must be one of: DEPARTMENT, BATCH, SECTION",
    };
  }
  return { ok: true };
}

export function validateDeanTargetType(role, targetType) {
  return validateFacultyScopedTargetType(String(role).toUpperCase() === "DEAN", targetType);
}
