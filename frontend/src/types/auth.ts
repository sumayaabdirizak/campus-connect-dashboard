export {
  ROLES,
  roleKey,
  isRole,
  isBuiltinRole,
  normalizeRoleName,
  isSuperAdminRole,
  isDeanRole,
  isTeacherRole,
  isStudentRole,
  isCrossFacultyAdmin,
  canManageOffices,
  canEnsureOfficeDefaults,
  isOfficeInboxOversight,
  isOfficeMessagesOnlyRole,
  canDirectMessage,
  isOfficeStaffRole,
  canStudentGroupDm,
  ANNOUNCEMENT_MANAGER_ROLES,
  ANNOUNCEMENT_AUDIENCE_ROLES,
  canManageAnnouncements,
  canAuthorInboxBroadcast,
  isAnnouncementAudienceRole,
  isAnnouncementStaffAuthor,
} from '@shared/roles';

/** Any platform role name (built-in or custom). */
export type Role = string;

export type BuiltinRole =
  | 'SUPER_ADMIN'
  | 'ACADEMIC_OFFICE'
  | 'DEAN'
  | 'TEACHER'
  | 'STUDENT';
