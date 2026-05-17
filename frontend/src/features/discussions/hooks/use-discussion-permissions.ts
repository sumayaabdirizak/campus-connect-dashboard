/**
 * Decodes a backend-provided decimal-string permission bitmask into a flat
 * record of booleans the UI can use to gate affordances.
 *
 * Backend stores permissions as bigint and serialises them with `.toString()`
 * (see backend/src/features/discussions/permissions.js), so values can exceed
 * 2^53. We must use BigInt for the bitwise AND.
 *
 * The PERMISSION_ADMINISTRATOR top bit short-circuits every check — server
 * owners, SUPER_ADMIN, and FACULTY_ADMIN role-holders carry it.
 */

'use client';

import { useMemo } from 'react';
import { PERMISSION_ADMINISTRATOR, PERMISSION_BITS } from '../api/types';

export type DiscussionPermissions = {
  canView: boolean;
  canSend: boolean;
  canReadHistory: boolean;
  canManageMessages: boolean;
  canManageChannel: boolean;
  canManageRoles: boolean;
  canManageServer: boolean;
  canPin: boolean;
  canReact: boolean;
  canMentionEveryone: boolean;
  canUseSlashCommands: boolean;
  canAttachFiles: boolean;
  canCreateThreads: boolean;
  canKickMembers: boolean;
  canBanMembers: boolean;
  canMuteMembers: boolean;
  canModerateMembers: boolean;
  canViewAuditLog: boolean;
  /** True if the caller has the ADMINISTRATOR bit (owner/super admin/faculty admin). */
  isAdmin: boolean;
};

const NONE: DiscussionPermissions = {
  canView: false,
  canSend: false,
  canReadHistory: false,
  canManageMessages: false,
  canManageChannel: false,
  canManageRoles: false,
  canManageServer: false,
  canPin: false,
  canReact: false,
  canMentionEveryone: false,
  canUseSlashCommands: false,
  canAttachFiles: false,
  canCreateThreads: false,
  canKickMembers: false,
  canBanMembers: false,
  canMuteMembers: false,
  canModerateMembers: false,
  canViewAuditLog: false,
  isAdmin: false
};

const ALL: DiscussionPermissions = {
  canView: true,
  canSend: true,
  canReadHistory: true,
  canManageMessages: true,
  canManageChannel: true,
  canManageRoles: true,
  canManageServer: true,
  canPin: true,
  canReact: true,
  canMentionEveryone: true,
  canUseSlashCommands: true,
  canAttachFiles: true,
  canCreateThreads: true,
  canKickMembers: true,
  canBanMembers: true,
  canMuteMembers: true,
  canModerateMembers: true,
  canViewAuditLog: true,
  isAdmin: true
};

function parseBits(input: string | null | undefined): bigint {
  if (!input) return BigInt(0);
  try {
    return BigInt(input);
  } catch {
    return BigInt(0);
  }
}

export function decodePermissions(input: string | null | undefined): DiscussionPermissions {
  if (!input) return NONE;
  const bits = parseBits(input);
  // Administrator short-circuit — match backend `hasPermission` semantics.
  if ((bits & PERMISSION_ADMINISTRATOR) !== BigInt(0)) return ALL;
  const has = (b: bigint) => (bits & b) === b;
  return {
    canView: has(PERMISSION_BITS.VIEW_CHANNEL),
    canSend: has(PERMISSION_BITS.SEND_MESSAGES),
    canReadHistory: has(PERMISSION_BITS.READ_MESSAGE_HISTORY),
    canManageMessages: has(PERMISSION_BITS.MANAGE_MESSAGES),
    canManageChannel: has(PERMISSION_BITS.MANAGE_CHANNEL),
    canManageRoles: has(PERMISSION_BITS.MANAGE_ROLES),
    canManageServer: has(PERMISSION_BITS.MANAGE_SERVER),
    canPin: has(PERMISSION_BITS.PIN_MESSAGES),
    canReact: has(PERMISSION_BITS.ADD_REACTIONS),
    canMentionEveryone: has(PERMISSION_BITS.MENTION_EVERYONE),
    canUseSlashCommands: false, // legacy field — backend has no USE_SLASH_COMMANDS bit
    canAttachFiles: has(PERMISSION_BITS.ATTACH_FILES),
    canCreateThreads: has(PERMISSION_BITS.CREATE_THREADS),
    canKickMembers: has(PERMISSION_BITS.KICK_MEMBERS),
    canBanMembers: has(PERMISSION_BITS.BAN_MEMBERS),
    canMuteMembers: has(PERMISSION_BITS.MUTE_MEMBERS),
    canModerateMembers: has(PERMISSION_BITS.MODERATE_MEMBERS),
    canViewAuditLog: has(PERMISSION_BITS.VIEW_AUDIT_LOG),
    isAdmin: false
  };
}

export function useDiscussionPermissions(
  myPermissions: string | null | undefined
): DiscussionPermissions {
  return useMemo(() => decodePermissions(myPermissions), [myPermissions]);
}
