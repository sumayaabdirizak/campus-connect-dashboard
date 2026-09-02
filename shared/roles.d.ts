export const ROLES: readonly ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'];

export type BuiltinRole = (typeof ROLES)[number];
export type Role = string;

export function roleKey(role: unknown): string;
export function isBuiltinRole(value: unknown): value is BuiltinRole;
export function isRole(value: unknown): value is Role;
export function normalizeRoleName(name: unknown): string;
export function isSuperAdminRole(role: unknown): boolean;
export function isDeanRole(role: unknown): boolean;
export function isTeacherRole(role: unknown): boolean;
export function isStudentRole(role: unknown): boolean;
export function isCrossFacultyAdmin(role: unknown): boolean;
export function canDirectMessage(role: unknown): boolean;
export function canCreateGroupDm(role: unknown): boolean;
export function canStudentGroupDm(role: unknown): boolean;
export function isOfficeMessagesOnlyRole(role: unknown): boolean;

export const ANNOUNCEMENT_MANAGER_ROLES: readonly ['SUPER_ADMIN', 'DEAN'];
export const CREATE_ANNOUNCEMENT_ROLES: ReadonlySet<string>;
export const ANNOUNCEMENT_AUDIENCE_ROLES: readonly [
  'STUDENT',
  'TEACHER',
  'DEAN',
  'SUPER_ADMIN'
];

export function canManageAnnouncements(role: unknown): boolean;
export function canAuthorInboxBroadcast(role: unknown): boolean;
export function isAnnouncementAudienceRole(role: unknown): boolean;
export function isAnnouncementStaffAuthor(role: unknown): boolean;
