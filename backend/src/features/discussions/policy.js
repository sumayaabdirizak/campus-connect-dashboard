export const DISCUSSION_SCOPE_TYPES = Object.freeze({
  FACULTY: "FACULTY",
  DEPARTMENT: "DEPARTMENT",
  BATCH: "BATCH",
  SECTION: "SECTION",
});

export const DISCUSSION_GROUP_KEY_PREFIX = Object.freeze({
  [DISCUSSION_SCOPE_TYPES.FACULTY]: "faculty",
  [DISCUSSION_SCOPE_TYPES.DEPARTMENT]: "department",
  [DISCUSSION_SCOPE_TYPES.BATCH]: "batch",
  [DISCUSSION_SCOPE_TYPES.SECTION]: "section",
});

export const DISCUSSION_CONTEXT_ROLES = Object.freeze({
  DEAN: "DEAN",
  HEAD: "HEAD",
  LECTURER: "LECTURER",
  ADVISOR: "ADVISOR",
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
});

export const STUDENT_POSTING_POLICY = Object.freeze({
  NO_POSTING: "NO_POSTING",
  REPLY_ONLY: "REPLY_ONLY",
  FULL_POSTING: "FULL_POSTING",
});

export const DEFAULT_STUDENT_POSTING_POLICY = STUDENT_POSTING_POLICY.REPLY_ONLY;

export const DISCUSSION_POST_READ_MATRIX = Object.freeze({
  [DISCUSSION_SCOPE_TYPES.FACULTY]: {
    canPostRoles: [DISCUSSION_CONTEXT_ROLES.DEAN, DISCUSSION_CONTEXT_ROLES.ADMIN],
    canReadRoles: [
      DISCUSSION_CONTEXT_ROLES.DEAN,
      DISCUSSION_CONTEXT_ROLES.HEAD,
      DISCUSSION_CONTEXT_ROLES.LECTURER,
      DISCUSSION_CONTEXT_ROLES.ADVISOR,
      DISCUSSION_CONTEXT_ROLES.STUDENT,
      DISCUSSION_CONTEXT_ROLES.ADMIN,
    ],
  },
  [DISCUSSION_SCOPE_TYPES.DEPARTMENT]: {
    canPostRoles: [
      DISCUSSION_CONTEXT_ROLES.HEAD,
      DISCUSSION_CONTEXT_ROLES.LECTURER,
      DISCUSSION_CONTEXT_ROLES.ADMIN,
    ],
    canReadRoles: [
      DISCUSSION_CONTEXT_ROLES.DEAN,
      DISCUSSION_CONTEXT_ROLES.HEAD,
      DISCUSSION_CONTEXT_ROLES.LECTURER,
      DISCUSSION_CONTEXT_ROLES.ADVISOR,
      DISCUSSION_CONTEXT_ROLES.STUDENT,
      DISCUSSION_CONTEXT_ROLES.ADMIN,
    ],
  },
  [DISCUSSION_SCOPE_TYPES.BATCH]: {
    canPostRoles: [
      DISCUSSION_CONTEXT_ROLES.LECTURER,
      DISCUSSION_CONTEXT_ROLES.ADVISOR,
      DISCUSSION_CONTEXT_ROLES.ADMIN,
    ],
    canReadRoles: [
      DISCUSSION_CONTEXT_ROLES.DEAN,
      DISCUSSION_CONTEXT_ROLES.HEAD,
      DISCUSSION_CONTEXT_ROLES.LECTURER,
      DISCUSSION_CONTEXT_ROLES.ADVISOR,
      DISCUSSION_CONTEXT_ROLES.STUDENT,
      DISCUSSION_CONTEXT_ROLES.ADMIN,
    ],
  },
  [DISCUSSION_SCOPE_TYPES.SECTION]: {
    canPostRoles: [
      DISCUSSION_CONTEXT_ROLES.LECTURER,
      DISCUSSION_CONTEXT_ROLES.ADVISOR,
      DISCUSSION_CONTEXT_ROLES.ADMIN,
    ],
    canReadRoles: [
      DISCUSSION_CONTEXT_ROLES.DEAN,
      DISCUSSION_CONTEXT_ROLES.HEAD,
      DISCUSSION_CONTEXT_ROLES.LECTURER,
      DISCUSSION_CONTEXT_ROLES.ADVISOR,
      DISCUSSION_CONTEXT_ROLES.STUDENT,
      DISCUSSION_CONTEXT_ROLES.ADMIN,
    ],
  },
});

export const DISCUSSION_MODERATION_MATRIX = Object.freeze({
  [DISCUSSION_CONTEXT_ROLES.DEAN]: {
    canDeleteMessage: true,
    canPinAnnouncement: true,
    canMuteUser: true,
    level: "FULL",
  },
  [DISCUSSION_CONTEXT_ROLES.HEAD]: {
    canDeleteMessage: true,
    canPinAnnouncement: true,
    canMuteUser: true,
    level: "FULL",
  },
  [DISCUSSION_CONTEXT_ROLES.LECTURER]: {
    canDeleteMessage: true,
    canPinAnnouncement: true,
    canMuteUser: false,
    level: "LIMITED",
  },
  [DISCUSSION_CONTEXT_ROLES.ADVISOR]: {
    canDeleteMessage: true,
    canPinAnnouncement: true,
    canMuteUser: false,
    level: "LIMITED",
  },
  [DISCUSSION_CONTEXT_ROLES.STUDENT]: {
    canDeleteMessage: false,
    canPinAnnouncement: false,
    canMuteUser: false,
    level: "NONE",
  },
  [DISCUSSION_CONTEXT_ROLES.ADMIN]: {
    canDeleteMessage: true,
    canPinAnnouncement: true,
    canMuteUser: true,
    level: "FULL",
  },
});

/**
 * Generate canonical group key for one academic entity.
 * Example: FACULTY + 9 => "faculty:9"
 */
export function toDiscussionGroupKey(scopeType, scopeId) {
  const normalizedScopeType = String(scopeType || "").toUpperCase();
  const prefix = DISCUSSION_GROUP_KEY_PREFIX[normalizedScopeType];
  const numericScopeId = Number(scopeId);

  if (!prefix) throw new Error(`Unsupported scope type: ${scopeType}`);
  if (!Number.isInteger(numericScopeId) || numericScopeId <= 0) {
    throw new Error(`Invalid scope id: ${scopeId}`);
  }
  return `${prefix}:${numericScopeId}`;
}

/**
 * Resolve the default post policy for a user role and scope.
 * Student posting is controlled by DEFAULT_STUDENT_POSTING_POLICY.
 */
export function getDefaultDiscussionPermissions({ scopeType, role }) {
  const normalizedScopeType = String(scopeType || "").toUpperCase();
  const normalizedRole = String(role || "").toUpperCase();
  const matrix = DISCUSSION_POST_READ_MATRIX[normalizedScopeType];

  if (!matrix) throw new Error(`Unsupported scope type: ${scopeType}`);

  const roleCanRead = matrix.canReadRoles.includes(normalizedRole);
  let canPost = matrix.canPostRoles.includes(normalizedRole);
  let postingMode = "NONE";

  if (normalizedRole === DISCUSSION_CONTEXT_ROLES.STUDENT) {
    if (DEFAULT_STUDENT_POSTING_POLICY === STUDENT_POSTING_POLICY.FULL_POSTING) {
      canPost = true;
      postingMode = "FULL";
    } else if (
      DEFAULT_STUDENT_POSTING_POLICY === STUDENT_POSTING_POLICY.REPLY_ONLY
    ) {
      canPost = true;
      postingMode = "REPLY_ONLY";
    } else {
      canPost = false;
      postingMode = "NONE";
    }
  } else if (canPost) {
    postingMode = "FULL";
  }

  const moderation = DISCUSSION_MODERATION_MATRIX[normalizedRole] ?? {
    canDeleteMessage: false,
    canPinAnnouncement: false,
    canMuteUser: false,
    level: "NONE",
  };

  return {
    canRead: roleCanRead,
    canPost,
    postingMode,
    canModerate: moderation.level !== "NONE",
    moderation,
  };
}
