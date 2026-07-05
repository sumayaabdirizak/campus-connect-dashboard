/**
 * Canonical global user roles. Mirrors the `Role` lookup table in
 * backend/prisma/schema.prisma (seeded, not a DB enum) — keep in sync with
 * backend/prisma/seed.js if roles are added/renamed there.
 * @type {readonly ['SUPER_ADMIN', 'DEAN', 'FACULTY_ADMIN', 'TEACHER', 'STUDENT']}
 */
export const ROLES = Object.freeze([
  'SUPER_ADMIN',
  'DEAN',
  'FACULTY_ADMIN',
  'TEACHER',
  'STUDENT',
]);

/** @typedef {typeof ROLES[number]} Role */

/**
 * @param {unknown} value
 * @returns {value is Role}
 */
export function isRole(value) {
  return typeof value === 'string' && ROLES.includes(value);
}
