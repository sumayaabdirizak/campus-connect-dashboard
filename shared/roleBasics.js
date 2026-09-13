/**
 * Role primitives — imported by `roles.js` and `communicationRoles.js` (no cycles).
 * @type {readonly ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT']}
 */
export const ROLES = Object.freeze([
  'SUPER_ADMIN',
  'DEAN',
  'TEACHER',
  'STUDENT',
]);

/** @typedef {typeof ROLES[number]} BuiltinRole */
/** @typedef {string} Role */

/** @param {unknown} role */
export function roleKey(role) {
  return String(role ?? '')
    .trim()
    .toUpperCase();
}

/**
 * @param {unknown} value
 * @returns {value is BuiltinRole}
 */
export function isBuiltinRole(value) {
  return typeof value === 'string' && ROLES.includes(/** @type {BuiltinRole} */ (value));
}

/**
 * @param {unknown} value
 * @returns {value is Role}
 */
export function isRole(value) {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 32;
}

/** @param {unknown} name */
export function normalizeRoleName(name) {
  return roleKey(name)
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

export function isSuperAdminRole(role) {
  return roleKey(role) === 'SUPER_ADMIN';
}

export function isDeanRole(role) {
  return roleKey(role) === 'DEAN';
}

export function isTeacherRole(role) {
  const r = roleKey(role);
  return r === 'TEACHER' || r === 'LECTURER';
}

export function isStudentRole(role) {
  return roleKey(role) === 'STUDENT';
}

/** Cross-faculty academic leadership (not system/roles/audit). */
export function isCrossFacultyAdmin(role) {
  return isSuperAdminRole(role);
}
