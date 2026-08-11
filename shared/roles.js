/**
 * Platform roles + Communication helpers.
 * Built-ins are seeded in backend/prisma/seed.js; custom Role rows may also exist.
 */
export {
  ROLES,
  roleKey,
  isBuiltinRole,
  isRole,
  normalizeRoleName,
  isSuperAdminRole,
  isDeanRole,
  isTeacherRole,
  isStudentRole,
  isCrossFacultyAdmin,
  canManageOffices,
  canEnsureOfficeDefaults,
} from './roleBasics.js';

export {
  isOfficeInboxOversight,
  isOfficeMessagesOnlyRole,
  canDirectMessage,
  isOfficeStaffRole,
  canCreateGroupDm,
  canStudentGroupDm,
  ANNOUNCEMENT_MANAGER_ROLES,
  CREATE_ANNOUNCEMENT_ROLES,
  ANNOUNCEMENT_AUDIENCE_ROLES,
  canManageAnnouncements,
  canAuthorInboxBroadcast,
  isAnnouncementAudienceRole,
  isAnnouncementStaffAuthor,
} from './communicationRoles.js';
