/**
 * Communication (Messages + Announcements) role helpers.
 * Prefer importing from `shared/roles.js` (barrel).
 */
import {
  isCrossFacultyAdmin,
  isDeanRole,
  isStudentRole,
  isTeacherRole,
  roleKey,
} from './roleBasics.js';

/** See and act on all office Message threads without a staff row. */
export function isOfficeInboxOversight(role) {
  return isCrossFacultyAdmin(role);
}

/**
 * Messages inbox: offices (+ own DMs) only — no clubs, faculty groups, or Discover.
 * Clubs stay via `/dashboard/dean/clubs` (or equivalent admin nav).
 */
export function isOfficeMessagesOnlyRole(role) {
  const r = roleKey(role);
  return r === 'ACADEMIC_OFFICE' || r === 'SUPER_ADMIN';
}

/** Teacher ↔ Dean, student ↔ course teachers, Office Staff desk scope, or Academic Office ↔ Dean. */
export function canDirectMessage(role) {
  return (
    isTeacherRole(role) ||
    isDeanRole(role) ||
    isStudentRole(role) ||
    roleKey(role) === 'OFFICE_STAFF' ||
    roleKey(role) === 'ACADEMIC_OFFICE'
  );
}

export function isOfficeStaffRole(role) {
  return roleKey(role) === 'OFFICE_STAFF';
}

/** Student peer groups, Academic Office staff groups, or Dean faculty groups. */
export function canCreateGroupDm(role) {
  return (
    isStudentRole(role) ||
    isDeanRole(role) ||
    roleKey(role) === 'ACADEMIC_OFFICE'
  );
}

/** @deprecated Prefer canCreateGroupDm — same allow-list. */
export function canStudentGroupDm(role) {
  return canCreateGroupDm(role);
}

/**
 * Roles that may create / pin / delete / draft announcements.
 * @type {readonly ['SUPER_ADMIN', 'ACADEMIC_OFFICE', 'DEAN', 'OFFICE_STAFF']}
 */
export const ANNOUNCEMENT_MANAGER_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'ACADEMIC_OFFICE',
  'DEAN',
  'OFFICE_STAFF',
]);

/** @type {ReadonlySet<string>} */
export const CREATE_ANNOUNCEMENT_ROLES = new Set(ANNOUNCEMENT_MANAGER_ROLES);

/** Audience filter chips / URL `role=` / create-dialog Visible to. */
export const ANNOUNCEMENT_AUDIENCE_ROLES = Object.freeze([
  'STUDENT',
  'TEACHER',
  'DEAN',
  'SUPER_ADMIN',
  'ACADEMIC_OFFICE',
  'OFFICE_STAFF',
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
