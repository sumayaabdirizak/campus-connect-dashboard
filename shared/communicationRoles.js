/**
 * Communication (Messages + Announcements) role helpers.
 * Prefer importing from `shared/roles.js` (barrel).
 */
import {
  isDeanRole,
  isStudentRole,
  isTeacherRole,
  roleKey,
} from './roleBasics.js';

/**
 * Support offices were removed. Kept so leftover inbox imports keep compiling.
 * Always false.
 */
export function isOfficeMessagesOnlyRole(_role) {
  return false;
}

/** Teacher ↔ Dean, student ↔ course teachers. */
export function canDirectMessage(role) {
  return (
    isTeacherRole(role) ||
    isDeanRole(role) ||
    isStudentRole(role)
  );
}

/** Student peer groups or Dean faculty groups. */
export function canCreateGroupDm(role) {
  return isStudentRole(role) || isDeanRole(role);
}

/** @deprecated Prefer canCreateGroupDm — same allow-list. */
export function canStudentGroupDm(role) {
  return canCreateGroupDm(role);
}

/**
 * Roles that may create / pin / delete / draft announcements.
 * @type {readonly ['SUPER_ADMIN', 'DEAN']}
 */
export const ANNOUNCEMENT_MANAGER_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'DEAN',
]);

/** @type {ReadonlySet<string>} */
export const CREATE_ANNOUNCEMENT_ROLES = new Set(ANNOUNCEMENT_MANAGER_ROLES);

/** Audience filter chips / URL `role=` / create-dialog Visible to. */
export const ANNOUNCEMENT_AUDIENCE_ROLES = Object.freeze([
  'STUDENT',
  'TEACHER',
  'DEAN',
  'SUPER_ADMIN',
]);

/** Create / pin / delete announcements (DEAN is faculty-scoped elsewhere). */
export function canManageAnnouncements(role) {
  return CREATE_ANNOUNCEMENT_ROLES.has(roleKey(role));
}

/** Same as announcement managers — inbox “New broadcast”. */
export function canAuthorInboxBroadcast(role) {
  return canManageAnnouncements(role);
}

/** Valid announcement audience role for filters (LECTURER → TEACHER). */
export function isAnnouncementAudienceRole(role) {
  const r = roleKey(role) === 'LECTURER' ? 'TEACHER' : roleKey(role);
  return ANNOUNCEMENT_AUDIENCE_ROLES.includes(/** @type {*} */ (r));
}

/** Author badge: staff vs student on announcement cards. */
export function isAnnouncementStaffAuthor(role) {
  const r = roleKey(role) === 'LECTURER' ? 'TEACHER' : roleKey(role);
  return r === 'TEACHER' || canManageAnnouncements(r);
}
