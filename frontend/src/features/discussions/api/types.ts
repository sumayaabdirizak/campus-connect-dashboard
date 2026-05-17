/**
 * Central type definitions for the Discussions module.
 *
 * Mirrors the shapes returned by the backend at /api/discussions/* (see
 * backend/src/controllers/discussions/discussions.js,
 * backend/src/controllers/discussions/groupDms.js).
 *
 * Types here are the source of truth for the api/service.ts +
 * api/queries.ts layer consumed by the discussions UI.
 */

// ────────────────────────────────────────────────────────────────────────────
// Common primitives
// ────────────────────────────────────────────────────────────────────────────

export type DiscussionRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export type DiscussionScopeType = 'FACULTY' | 'DEPARTMENT' | 'BATCH' | 'SECTION' | 'COURSE_OFFERING';

export type DiscussionMessageType = 'TEXT' | 'MEDIA' | 'SYSTEM' | 'QUESTION';

export type DiscussionChannelKind = 'TEXT' | 'ANNOUNCEMENT' | 'FORUM';

export type UserStub = {
  id: number;
  full_name: string;
};

// ────────────────────────────────────────────────────────────────────────────
// Servers (groups with kind = FACULTY_SERVER | USER_SERVER)
// ────────────────────────────────────────────────────────────────────────────

export type DiscussionServer = {
  id: number;
  name: string;
  scopeType: DiscussionScopeType | string;
  scopeId: number;
  kind: 'FACULTY_SERVER' | 'USER_SERVER' | string;
  iconUrl?: string | null;
  description?: string | null;
  defaultChannelId: number | null;
  ownerId?: number | null;
  e2eeEnabled?: boolean;
  e2eeCurrentKeyVersion?: number;
  e2eeRotationRequired?: boolean;
  status?: 'ACTIVE' | 'ARCHIVED' | string;
  myMembershipRole?: DiscussionRole;
  /** Decimal string of permission bitmask, only set on /servers/:id. */
  myServerPermissions?: string;
};

export type DiscussionChannelCategory = {
  id: number;
  serverId: number;
  systemKey: string;
  name: string;
  position: number;
  isSystem: boolean;
};

export type DiscussionChannel = {
  id: number;
  serverId: number;
  categoryId?: number | null;
  name: string;
  slug: string;
  topic?: string | null;
  kind: DiscussionChannelKind | string;
  isPrivate?: boolean;
  /**
   * The server's landing channel. Backend refuses to privatize this row so
   * `@everyone` doesn't get locked out, and the UI mirrors that rule.
   */
  isDefault?: boolean;
  position: number;
  /** Minimum seconds between messages from the same user (0 = off). */
  slowModeSeconds?: number;
  archivedAt?: string | null;
  /** Decimal string of permission bitmask for the calling user. */
  myPermissions?: string;
};

export type DiscussionRoleRow = {
  id: number;
  serverId: number;
  /** Stable key from the server template, e.g. `EVERYONE`, `DEAN`. */
  systemKey?: string;
  name: string;
  color?: string | null;
  position: number;
  /** Decimal string. */
  permissions: string;
};

export type ServerDetailResponse = {
  server: DiscussionServer;
  categories: DiscussionChannelCategory[];
  channels: DiscussionChannel[];
  roles: DiscussionRoleRow[];
  myServerPermissions: string;
};

export type ServerListResponse = {
  results: DiscussionServer[];
};

export type ChannelListResponse = {
  results: DiscussionChannel[];
};

export type ChannelDetailResponse = {
  channel: DiscussionChannel & { category?: DiscussionChannelCategory | null };
  myPermissions: string;
};

export type DiscussionAuditLogEntry = {
  id: number;
  serverId: number;
  channelId: number | null;
  actorUserId: number;
  actor: UserStub | null;
  action: string;
  targetType: string;
  targetId: number;
  before: unknown;
  after: unknown;
  createdAt: string;
};

export type ChannelAuditLogResponse = {
  results: DiscussionAuditLogEntry[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ────────────────────────────────────────────────────────────────────────────
// Channel permission overwrites (A7)
// ────────────────────────────────────────────────────────────────────────────

export type DiscussionOverwriteTarget = 'ROLE' | 'MEMBER';

/**
 * One row out of `DiscussionPermissionOverwrite`. Allow/deny are decimal-string
 * BigInts because the underlying column is `BigInt` and the masks regularly
 * exceed `Number.MAX_SAFE_INTEGER`.
 */
export type DiscussionOverwrite = {
  id: number;
  channelId: number;
  targetType: DiscussionOverwriteTarget;
  targetId: number;
  /** Decimal string. */
  allow: string;
  /** Decimal string. */
  deny: string;
};

export type ChannelOverwritesResponse = {
  results: DiscussionOverwrite[];
};

export type ChannelOverwriteUpsertResponse = {
  overwrite: DiscussionOverwrite;
};

// ────────────────────────────────────────────────────────────────────────────
// Channel members
// ────────────────────────────────────────────────────────────────────────────

export type ChannelMember = {
  userId: number;
  role: DiscussionRole;
  canPost: boolean;
  canModerate: boolean;
  joinedAt: string;
  user: {
    id: number;
    full_name: string;
    email?: string | null;
    number?: string | null;
    status?: string;
    role?: string | null;
  } | null;
};

export type ChannelMembersResponse = {
  results: ChannelMember[];
};

// ────────────────────────────────────────────────────────────────────────────
// Member presence
// ────────────────────────────────────────────────────────────────────────────

export type PresenceState = 'online' | 'away' | 'dnd' | 'offline';

export type MemberPresenceRow = {
  userId: number;
  membershipRole?: DiscussionRole;
  user: {
    id: number;
    full_name: string;
    discussionCustomStatus?: string | null;
    roleName?: string | null;
  } | null;
  presence: PresenceState;
  lastSeenAt: string | null;
  statusLine?: string | null;
  sessionConnected: boolean;
  suppressPings?: boolean;
  idleExtended?: boolean;
};

export type ServerPresenceResponse = {
  groupId: number;
  results: MemberPresenceRow[];
};

// ────────────────────────────────────────────────────────────────────────────
// Messages
// ────────────────────────────────────────────────────────────────────────────

export type MessageReaction = {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  createdAt?: string;
  user?: UserStub;
};

export type MessageAttachment = {
  id: number;
  fileType: string;
  mimeType?: string;
  size?: number;
  url?: string;
  /** Signed, short-lived URL returned by the backend. */
  accessUrl?: string;
  isE2EE?: boolean;
  ciphertextHash?: string | null;
  keyVersion?: number | null;
};

export type ThreadPreview = {
  replyCount: number;
  lastReplyAt: string | null;
  previewSenders: UserStub[];
};

export type DiscussionMessage = {
  id: number;
  groupId?: number | null;
  groupDmId?: number | null;
  channelId?: number | null;
  serverId?: number | null;
  senderId: number | null;
  content: string | null;
  /** E2EE fields — present when the channel/server has e2eeEnabled. */
  ciphertext?: string | null;
  nonce?: string | null;
  keyVersion?: number | null;
  senderDeviceId?: string | null;
  messageType: DiscussionMessageType | string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  parentMessageId?: number | null;
  isAnonymous?: boolean;
  isAcceptedAnswer?: boolean;
  sender?: UserStub | null;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  threadPreview?: ThreadPreview | null;
  /** Set on server-wide search results so each row can show "in #name". */
  channel?: { id: number; name: string; slug: string } | null;
};

export type SearchFilterSummary = {
  from?: string;
  has?: 'image' | 'video' | 'file' | 'attachment';
  before?: string;
  after?: string;
};

export type ChannelMessagesResponse = {
  results: DiscussionMessage[];
  nextCursor: string | null;
  hasMore: boolean;
  threadRoot?: number | null;
};

export type SendMessagePayload = {
  content?: string | null;
  messageType?: DiscussionMessageType;
  postAsQuestion?: boolean;
  isAnonymous?: boolean;
  attachmentIds?: number[];
  parentMessageId?: number | null;
  e2e?: {
    ciphertext: string;
    nonce: string;
    keyVersion: number;
    senderDeviceId: string;
  };
};

export type EditMessagePayload = {
  content?: string | null;
};

// ────────────────────────────────────────────────────────────────────────────
// Pins
// ────────────────────────────────────────────────────────────────────────────

export type ChannelPin = {
  id: number;
  groupId: number;
  messageId: number;
  pinnedAt: string;
  unpinnedAt?: string | null;
  message: DiscussionMessage;
  pinnedBy?: UserStub | null;
};

export type ChannelPinsResponse = {
  results: ChannelPin[];
};

// ────────────────────────────────────────────────────────────────────────────
// Group DMs
// ────────────────────────────────────────────────────────────────────────────

export type GroupDmSummary = {
  id: number;
  name: string | null;
  iconUrl?: string | null;
  createdAt: string;
  memberCount: number;
  previewMembers: UserStub[];
  lastMessage: {
    id: number;
    content: string | null;
    ciphertext?: string | null;
    messageType: string;
    createdAt: string;
    sender: UserStub | null;
  } | null;
  myRole: DiscussionRole;
};

export type GroupDmListResponse = {
  results: GroupDmSummary[];
};

export type GroupDmMember = {
  id: number;
  groupDmId: number;
  userId: number;
  role: DiscussionRole;
  canPost: boolean;
  joinedAt: string;
  leftAt?: string | null;
  user: {
    id: number;
    full_name: string;
    email?: string | null;
  } | null;
};

export type GroupDmDetail = {
  id: number;
  name: string | null;
  iconUrl?: string | null;
  createdById: number;
  createdAt: string;
  archivedAt?: string | null;
  members: GroupDmMember[];
};

export type GroupDmDetailResponse = {
  groupDm: GroupDmDetail;
  myRole: DiscussionRole;
};

export type GroupDmMessagesResponse = {
  results: DiscussionMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type CreateGroupDmPayload = {
  name?: string | null;
  memberUserIds: number[];
};

export type GroupDmCandidate = {
  id: number;
  full_name: string;
  email?: string | null;
};

export type GroupDmCandidatesResponse = {
  results: GroupDmCandidate[];
};

// ────────────────────────────────────────────────────────────────────────────
// Notifications + unread
// ────────────────────────────────────────────────────────────────────────────

export type DiscussionNotificationType = 'MESSAGE' | 'MENTION' | 'REACTION' | 'PIN' | string;

/** Shape returned by GET /me/notifications after enrichment. */
export type DiscussionNotification = {
  id: number;
  userId: number;
  groupId: number | null;
  messageId: number | null;
  type: DiscussionNotificationType;
  payload: {
    groupId?: number;
    channelId?: number;
    channelSlug?: string;
    messageId?: number;
    senderId?: number;
    senderName?: string;
    groupDmId?: number;
    pinnedById?: number;
    pinnedByName?: string;
    reactorId?: number;
    reactorName?: string;
    emoji?: string;
    [k: string]: unknown;
  } | null;
  readAt?: string | null;
  createdAt: string;
  display?: {
    channelSlug: string | null;
    channelHash: string | null;
    channelName: string | null;
    groupLabel: string | null;
    snippet: string | null;
    messageSenderName: string | null;
  };
};

export type NotificationsListResponse = {
  results: DiscussionNotification[];
};

export type MarkReadPayload = {
  notificationIds?: number[];
  groupId?: number;
  groupDmId?: number;
  upToCreatedAt?: string;
  markAll?: boolean;
};

export type UnreadCountResponse = {
  unreadCount: number;
};

/** Shape emitted by backend's `unread:update` socket event (buildUnreadSocketPayload). */
export type UnreadSocketPayload = {
  globalUnread: number;
  byGroup: Array<{ groupId: number; unreadCount: number }>;
  byGroupDm: Array<{ groupDmId: number; unreadCount: number }>;
};

// ────────────────────────────────────────────────────────────────────────────
// Permissions (mirrors backend/src/features/discussions/permissions.js)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Bit flags for channel/server permissions. Kept in sync with
 * `PERMISSION_BITS` on the server. Stored on the wire as decimal strings,
 * decoded with BigInt because they may exceed 2^32.
 */
const ONE = BigInt(1);
const bit = (n: number) => ONE << BigInt(n);

/**
 * Permission bit positions — MUST match backend `permissions.js` exactly.
 * Backend serializes the bitmask as a decimal string and the frontend has
 * to decode it with identical bit indices.
 */
export const PERMISSION_BITS = {
  VIEW_CHANNEL: bit(0),
  READ_MESSAGE_HISTORY: bit(1),
  SEND_MESSAGES: bit(2),
  ATTACH_FILES: bit(3),
  EMBED_LINKS: bit(4),
  ADD_REACTIONS: bit(5),
  USE_EXTERNAL_EMOJI: bit(6),
  MENTION_EVERYONE: bit(7),
  CREATE_THREADS: bit(8),
  SEND_MESSAGES_IN_THREADS: bit(9),
  MANAGE_MESSAGES: bit(10),
  MANAGE_THREADS: bit(11),
  PIN_MESSAGES: bit(12),
  MANAGE_CHANNEL: bit(13),
  MANAGE_ROLES: bit(14),
  MANAGE_SERVER: bit(15),
  KICK_MEMBERS: bit(16),
  BAN_MEMBERS: bit(17),
  CREATE_INVITE: bit(18),
  VIEW_AUDIT_LOG: bit(19),
  MANAGE_EMOJI: bit(20),
  MUTE_MEMBERS: bit(21),
  MODERATE_MEMBERS: bit(22)
} as const;

/** Top-bit "skip-all-checks" flag. Server owner / SUPER_ADMIN / FACULTY_ADMIN. */
export const PERMISSION_ADMINISTRATOR = ONE << BigInt(31);

export type PermissionBit = keyof typeof PERMISSION_BITS;
