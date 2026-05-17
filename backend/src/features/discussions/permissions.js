/**
 * Discord-style permission engine for the Discussion module.
 *
 * Permissions are stored as a 64-bit BigInt bitmask. Each channel can carry
 * `DiscussionPermissionOverwrite` rows that target either a server role or a
 * specific user; `allow` bits override `deny` which override role-defaults.
 *
 * Effective permissions for (user, channel) are computed in this order:
 *   1. Start with EVERYONE role's permissions on the server.
 *   2. OR-in the user's other roles on the server (system role bundles).
 *   3. Apply role-level channel overwrites (deny then allow).
 *   4. Apply member-level channel overwrites (deny then allow).
 *   5. SUPER_ADMIN, server owner, and FACULTY_ADMIN role short-circuit to ALL.
 */

import { prisma } from "../../db/prisma.js";
import { userMayAccessDiscussionChannelScope } from "./channelScopeAccess.js";

/**
 * Permission bit definitions. Keep stable: persisted in `allow`/`deny` rows
 * and in pre-seeded `DiscussionRole.permissions` masks.
 */
export const PERMISSION_BITS = Object.freeze({
  VIEW_CHANNEL: 1n << 0n,
  READ_MESSAGE_HISTORY: 1n << 1n,
  SEND_MESSAGES: 1n << 2n,
  ATTACH_FILES: 1n << 3n,
  EMBED_LINKS: 1n << 4n,
  ADD_REACTIONS: 1n << 5n,
  USE_EXTERNAL_EMOJI: 1n << 6n,
  MENTION_EVERYONE: 1n << 7n,
  CREATE_THREADS: 1n << 8n,
  SEND_MESSAGES_IN_THREADS: 1n << 9n,
  MANAGE_MESSAGES: 1n << 10n,
  MANAGE_THREADS: 1n << 11n,
  PIN_MESSAGES: 1n << 12n,
  MANAGE_CHANNEL: 1n << 13n,
  MANAGE_ROLES: 1n << 14n,
  MANAGE_SERVER: 1n << 15n,
  KICK_MEMBERS: 1n << 16n,
  BAN_MEMBERS: 1n << 17n,
  CREATE_INVITE: 1n << 18n,
  VIEW_AUDIT_LOG: 1n << 19n,
  MANAGE_EMOJI: 1n << 20n,
  MUTE_MEMBERS: 1n << 21n,
  MODERATE_MEMBERS: 1n << 22n,
});

/**
 * The "ADMINISTRATOR-equivalent" mask. When set, all permission checks pass.
 * SUPER_ADMIN (global role), server owner, and FACULTY_ADMIN system role get this.
 */
export const PERMISSION_ADMINISTRATOR = 1n << 31n;

export const PERMISSION_ALL = (() => {
  let all = PERMISSION_ADMINISTRATOR;
  for (const bit of Object.values(PERMISSION_BITS)) all |= bit;
  return all;
})();

/**
 * Pre-seeded role bundles for academic faculty servers. Names map 1:1 to
 * `DiscussionRole.systemKey`. Permissions here represent server-wide defaults;
 * per-channel overrides come from `DiscussionPermissionOverwrite`.
 */
const B = PERMISSION_BITS;

export const SYSTEM_ROLE_KEYS = Object.freeze({
  EVERYONE: "EVERYONE",
  STUDENT: "STUDENT",
  LECTURER: "LECTURER",
  DEAN: "DEAN",
  FACULTY_ADMIN: "FACULTY_ADMIN",
});

export const SYSTEM_ROLE_DEFAULTS = Object.freeze({
  [SYSTEM_ROLE_KEYS.EVERYONE]:
    B.VIEW_CHANNEL |
    B.READ_MESSAGE_HISTORY |
    B.SEND_MESSAGES |
    B.ATTACH_FILES |
    B.EMBED_LINKS |
    B.ADD_REACTIONS |
    B.USE_EXTERNAL_EMOJI |
    B.CREATE_THREADS |
    B.SEND_MESSAGES_IN_THREADS,
  [SYSTEM_ROLE_KEYS.STUDENT]:
    B.VIEW_CHANNEL |
    B.READ_MESSAGE_HISTORY |
    B.SEND_MESSAGES |
    B.ATTACH_FILES |
    B.EMBED_LINKS |
    B.ADD_REACTIONS |
    B.USE_EXTERNAL_EMOJI |
    B.CREATE_THREADS |
    B.SEND_MESSAGES_IN_THREADS,
  [SYSTEM_ROLE_KEYS.LECTURER]:
    B.VIEW_CHANNEL |
    B.READ_MESSAGE_HISTORY |
    B.SEND_MESSAGES |
    B.ATTACH_FILES |
    B.EMBED_LINKS |
    B.ADD_REACTIONS |
    B.USE_EXTERNAL_EMOJI |
    B.CREATE_THREADS |
    B.SEND_MESSAGES_IN_THREADS |
    B.MANAGE_MESSAGES |
    B.MANAGE_THREADS |
    B.PIN_MESSAGES |
    B.MENTION_EVERYONE,
  [SYSTEM_ROLE_KEYS.DEAN]:
    B.VIEW_CHANNEL |
    B.READ_MESSAGE_HISTORY |
    B.SEND_MESSAGES |
    B.ATTACH_FILES |
    B.EMBED_LINKS |
    B.ADD_REACTIONS |
    B.USE_EXTERNAL_EMOJI |
    B.CREATE_THREADS |
    B.SEND_MESSAGES_IN_THREADS |
    B.MANAGE_MESSAGES |
    B.MANAGE_THREADS |
    B.PIN_MESSAGES |
    B.MANAGE_CHANNEL |
    B.MANAGE_ROLES |
    B.MENTION_EVERYONE |
    B.VIEW_AUDIT_LOG |
    B.MUTE_MEMBERS |
    B.MODERATE_MEMBERS,
  [SYSTEM_ROLE_KEYS.FACULTY_ADMIN]: PERMISSION_ADMINISTRATOR,
});

export function hasPermission(mask, bit) {
  const m = BigInt(mask ?? 0n);
  if ((m & PERMISSION_ADMINISTRATOR) !== 0n) return true;
  return (m & BigInt(bit)) !== 0n;
}

export function combine(...masks) {
  let out = 0n;
  for (const m of masks) out |= BigInt(m ?? 0n);
  return out;
}

/**
 * Map a global User.role.name (e.g. "STUDENT", "TEACHER", "DEAN", "FACULTY_ADMIN",
 * "SUPER_ADMIN") to the academic system role key used inside academic servers.
 */
export function mapGlobalRoleToSystemRoleKey(globalRoleName) {
  const r = String(globalRoleName || "").toUpperCase();
  switch (r) {
    case "STUDENT":
      return SYSTEM_ROLE_KEYS.STUDENT;
    case "TEACHER":
    case "LECTURER":
      return SYSTEM_ROLE_KEYS.LECTURER;
    case "DEAN":
      return SYSTEM_ROLE_KEYS.DEAN;
    case "FACULTY_ADMIN":
      return SYSTEM_ROLE_KEYS.FACULTY_ADMIN;
    case "SUPER_ADMIN":
      return SYSTEM_ROLE_KEYS.FACULTY_ADMIN;
    default:
      return null;
  }
}

/**
 * Map a club membership's stored `DiscussionGroupMembership.role` value to the
 * club system-role key used in `seedClubSystemRoles`.
 *
 * Storage layer uses existing enum values as proxies:
 *   ADMIN / HEAD  → MODERATOR  (club moderation powers)
 *   DEAN          → MODERATOR  (owner normally short-circuits; defensive)
 *   everything else (STUDENT, LECTURER, ADVISOR) → MEMBER
 *
 * Owner is resolved via `DiscussionGroup.ownerId` short-circuit before this
 * function is ever reached, so 'DEAN' rarely gets here.
 */
export function mapClubMembershipRoleToSystemKey(membershipRole) {
  const r = String(membershipRole || '').toUpperCase();
  switch (r) {
    case 'ADMIN':
    case 'HEAD':
    case 'DEAN':
      return 'MODERATOR';
    case 'STUDENT':
    case 'LECTURER':
    case 'ADVISOR':
      return 'MEMBER';
    default:
      return 'MEMBER';
  }
}

/**
 * Compute a user's effective permission bitmask in a specific channel.
 * Returns a BigInt. SUPER_ADMIN globally short-circuits to ALL.
 *
 * @param {{ userId: number, channelId: number, prismaClient?: any }} args
 */
export async function computeChannelPermissions({ userId, channelId, prismaClient = prisma }) {
  const channel = await prismaClient.discussionChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      serverId: true,
      isPrivate: true,
      scopeType: true,
      scopeId: true,
      server: {
        select: {
          id: true,
          ownerId: true,
          // Needed for the USER_SERVER (clubs) branch below — when the server
          // is a club, we resolve the user's role from `membership.role`
          // ('MEMBER'|'MODERATOR') instead of mapGlobalRoleToSystemRoleKey,
          // because club roles are server-scoped, not global academic roles.
          kind: true,
        },
      },
    },
  });
  if (!channel) return 0n;
  const serverId = channel.serverId;

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { id: true, role: { select: { name: true } } },
  });
  if (!user) return 0n;

  const globalRole = String(user.role?.name || "").toUpperCase();
  if (globalRole === "SUPER_ADMIN") return PERMISSION_ALL;
  if (channel.server.ownerId === userId) return PERMISSION_ALL;

  const [systemRoles, membership, roleOverwrites, memberOverwrites] = await Promise.all([
    prismaClient.discussionRole.findMany({
      where: { serverId, isSystem: true },
      select: { id: true, systemKey: true, permissions: true },
    }),
    prismaClient.discussionGroupMembership.findFirst({
      where: { groupId: serverId, userId, leftAt: null },
      select: { id: true, role: true, isActive: true },
    }),
    prismaClient.discussionPermissionOverwrite.findMany({
      where: { channelId, targetType: "ROLE" },
      select: { targetId: true, allow: true, deny: true },
    }),
    prismaClient.discussionPermissionOverwrite.findMany({
      where: { channelId, targetType: "MEMBER", targetId: userId },
      select: { allow: true, deny: true },
    }),
  ]);

  const systemKeyById = new Map(systemRoles.map((r) => [r.id, r.systemKey]));
  const everyone = systemRoles.find((r) => r.systemKey === SYSTEM_ROLE_KEYS.EVERYONE);
  let perms = everyone ? BigInt(everyone.permissions) : SYSTEM_ROLE_DEFAULTS[SYSTEM_ROLE_KEYS.EVERYONE];

  // Clubs (USER_SERVER) use server-scoped membership roles (MEMBER|MODERATOR)
  // instead of the global academic role mapping. Owner is handled at line ~202
  // by the short-circuit; OWNER never reaches here. Non-members on a club
  // server fall back to EVERYONE only (no additional grants).
  const isClubServer = channel.server?.kind === 'USER_SERVER';
  const userSystemKey = isClubServer
    ? (membership?.role && membership.isActive !== false
        ? mapClubMembershipRoleToSystemKey(membership.role)
        : null)
    : mapGlobalRoleToSystemRoleKey(globalRole);
  if (userSystemKey && userSystemKey !== SYSTEM_ROLE_KEYS.EVERYONE) {
    const r = systemRoles.find((sr) => sr.systemKey === userSystemKey);
    if (r) perms |= BigInt(r.permissions);
    else if (SYSTEM_ROLE_DEFAULTS[userSystemKey] != null)
      perms |= SYSTEM_ROLE_DEFAULTS[userSystemKey];
  }

  if ((perms & PERMISSION_ADMINISTRATOR) !== 0n) return PERMISSION_ALL;

  const effectiveRoleIds = new Set();
  if (everyone) effectiveRoleIds.add(everyone.id);
  if (userSystemKey) {
    const r = systemRoles.find((sr) => sr.systemKey === userSystemKey);
    if (r) effectiveRoleIds.add(r.id);
  }

  let allowMask = 0n;
  let denyMask = 0n;
  for (const o of roleOverwrites) {
    if (!effectiveRoleIds.has(o.targetId)) continue;
    denyMask |= BigInt(o.deny);
    allowMask |= BigInt(o.allow);
  }
  perms = (perms & ~denyMask) | allowMask;

  let mDeny = 0n;
  let mAllow = 0n;
  for (const o of memberOverwrites) {
    mDeny |= BigInt(o.deny);
    mAllow |= BigInt(o.allow);
  }
  perms = (perms & ~mDeny) | mAllow;

  if (channel.isPrivate) {
    const hasMember = memberOverwrites.length > 0;
    const hasMembership = !!membership && membership.isActive !== false;
    if (!hasMember && !hasMembership) {
      perms &= ~B.VIEW_CHANNEL;
      perms &= ~B.READ_MESSAGE_HISTORY;
      perms &= ~B.SEND_MESSAGES;
    }
  }

  if (channel.scopeType != null && channel.scopeId != null) {
    const inScope = await userMayAccessDiscussionChannelScope({
      userId,
      scopeType: channel.scopeType,
      scopeId: channel.scopeId,
      prismaClient,
    });
    if (!inScope) {
      perms &= ~(
        B.VIEW_CHANNEL |
        B.READ_MESSAGE_HISTORY |
        B.SEND_MESSAGES |
        B.ATTACH_FILES |
        B.EMBED_LINKS |
        B.ADD_REACTIONS |
        B.USE_EXTERNAL_EMOJI |
        B.CREATE_THREADS |
        B.SEND_MESSAGES_IN_THREADS |
        B.MANAGE_MESSAGES |
        B.MANAGE_THREADS |
        B.PIN_MESSAGES |
        B.MENTION_EVERYONE
      );
    }
  }

  void systemKeyById;
  return perms;
}

/**
 * Batched variant of `computeChannelPermissions` for every channel in a
 * server. Use this for endpoints that loop over channels (e.g. listing the
 * sidebar) — it issues O(1) DB queries instead of O(N).
 *
 * Returns `{ channels, perms }` where `perms` is `Map<channelId, BigInt>`.
 *
 * Per-scoped-channel still calls `userMayAccessDiscussionChannelScope`, but
 * the heavy "everyone-role / membership / overwrites" round trips happen once
 * per server, not once per channel.
 *
 * @param {{ userId: number, serverId: number, prismaClient?: any }} args
 */
export async function computeChannelPermissionsForServer({
  userId,
  serverId,
  prismaClient = prisma,
}) {
  const [user, server, channels] = await Promise.all([
    prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { name: true } } },
    }),
    prismaClient.discussionGroup.findUnique({
      where: { id: serverId },
      select: { id: true, ownerId: true, kind: true },
    }),
    prismaClient.discussionChannel.findMany({
      where: { serverId, archivedAt: null },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    }),
  ]);

  if (!user || !server) return { channels: channels ?? [], perms: new Map() };

  const globalRole = String(user.role?.name || "").toUpperCase();

  const allMap = () => {
    const m = new Map();
    for (const c of channels) m.set(c.id, PERMISSION_ALL);
    return m;
  };

  if (globalRole === "SUPER_ADMIN" || server.ownerId === userId) {
    return { channels, perms: allMap() };
  }

  const channelIds = channels.map((c) => c.id);
  const [systemRoles, membership, roleOverwrites, memberOverwrites] = await Promise.all([
    prismaClient.discussionRole.findMany({
      where: { serverId, isSystem: true },
      select: { id: true, systemKey: true, permissions: true },
    }),
    prismaClient.discussionGroupMembership.findFirst({
      where: { groupId: serverId, userId, leftAt: null },
      select: { id: true, role: true, isActive: true },
    }),
    channelIds.length
      ? prismaClient.discussionPermissionOverwrite.findMany({
          where: { channelId: { in: channelIds }, targetType: "ROLE" },
          select: { channelId: true, targetId: true, allow: true, deny: true },
        })
      : Promise.resolve([]),
    channelIds.length
      ? prismaClient.discussionPermissionOverwrite.findMany({
          where: {
            channelId: { in: channelIds },
            targetType: "MEMBER",
            targetId: userId,
          },
          select: { channelId: true, allow: true, deny: true },
        })
      : Promise.resolve([]),
  ]);

  const everyone = systemRoles.find((r) => r.systemKey === SYSTEM_ROLE_KEYS.EVERYONE);
  const everyonePerms = everyone
    ? BigInt(everyone.permissions)
    : SYSTEM_ROLE_DEFAULTS[SYSTEM_ROLE_KEYS.EVERYONE];

  // Same USER_SERVER branch as computeChannelPermissions — club roles are
  // server-scoped, not global. Non-members on a club server fall back to
  // EVERYONE only.
  const isClubServer = server.kind === 'USER_SERVER';
  const userSystemKey = isClubServer
    ? (membership?.role && membership.isActive !== false
        ? mapClubMembershipRoleToSystemKey(membership.role)
        : null)
    : mapGlobalRoleToSystemRoleKey(globalRole);
  let basePerms = everyonePerms;
  if (userSystemKey && userSystemKey !== SYSTEM_ROLE_KEYS.EVERYONE) {
    const r = systemRoles.find((sr) => sr.systemKey === userSystemKey);
    if (r) basePerms |= BigInt(r.permissions);
    else if (SYSTEM_ROLE_DEFAULTS[userSystemKey] != null)
      basePerms |= SYSTEM_ROLE_DEFAULTS[userSystemKey];
  }

  if ((basePerms & PERMISSION_ADMINISTRATOR) !== 0n) {
    return { channels, perms: allMap() };
  }

  const effectiveRoleIds = new Set();
  if (everyone) effectiveRoleIds.add(everyone.id);
  if (userSystemKey) {
    const r = systemRoles.find((sr) => sr.systemKey === userSystemKey);
    if (r) effectiveRoleIds.add(r.id);
  }

  // Group overwrites by channel for O(1) lookup in the per-channel pass.
  const roleOverwritesByCh = new Map();
  for (const o of roleOverwrites) {
    if (!effectiveRoleIds.has(o.targetId)) continue;
    let cur = roleOverwritesByCh.get(o.channelId);
    if (!cur) {
      cur = { allowMask: 0n, denyMask: 0n };
      roleOverwritesByCh.set(o.channelId, cur);
    }
    cur.denyMask |= BigInt(o.deny);
    cur.allowMask |= BigInt(o.allow);
  }
  const memberOverwritesByCh = new Map();
  for (const o of memberOverwrites) {
    let cur = memberOverwritesByCh.get(o.channelId);
    if (!cur) {
      cur = { allowMask: 0n, denyMask: 0n };
      memberOverwritesByCh.set(o.channelId, cur);
    }
    cur.denyMask |= BigInt(o.deny);
    cur.allowMask |= BigInt(o.allow);
  }

  // Scope checks for channels that have one. Done in parallel rather than
  // sequentially. Each scope check still issues a few queries but they run
  // concurrently and only fire for scoped channels.
  const scopedChannels = channels.filter(
    (c) => c.scopeType != null && c.scopeId != null
  );
  const scopeAccessByCh = new Map();
  if (scopedChannels.length > 0) {
    const results = await Promise.all(
      scopedChannels.map((c) =>
        userMayAccessDiscussionChannelScope({
          userId,
          scopeType: c.scopeType,
          scopeId: c.scopeId,
          prismaClient,
        }).then((ok) => [c.id, ok])
      )
    );
    for (const [cid, ok] of results) scopeAccessByCh.set(cid, ok);
  }

  const perms = new Map();
  for (const c of channels) {
    let p = basePerms;
    const ro = roleOverwritesByCh.get(c.id);
    if (ro) p = (p & ~ro.denyMask) | ro.allowMask;
    const mo = memberOverwritesByCh.get(c.id);
    if (mo) p = (p & ~mo.denyMask) | mo.allowMask;

    if (c.isPrivate) {
      const hasMember = !!mo;
      const hasMembership = !!membership && membership.isActive !== false;
      if (!hasMember && !hasMembership) {
        p &= ~PERMISSION_BITS.VIEW_CHANNEL;
        p &= ~PERMISSION_BITS.READ_MESSAGE_HISTORY;
        p &= ~PERMISSION_BITS.SEND_MESSAGES;
      }
    }

    if (c.scopeType != null && c.scopeId != null) {
      const inScope = scopeAccessByCh.get(c.id) ?? false;
      if (!inScope) {
        p &= ~(
          B.VIEW_CHANNEL |
          B.READ_MESSAGE_HISTORY |
          B.SEND_MESSAGES |
          B.ATTACH_FILES |
          B.EMBED_LINKS |
          B.ADD_REACTIONS |
          B.USE_EXTERNAL_EMOJI |
          B.CREATE_THREADS |
          B.SEND_MESSAGES_IN_THREADS |
          B.MANAGE_MESSAGES |
          B.MANAGE_THREADS |
          B.PIN_MESSAGES |
          B.MENTION_EVERYONE
        );
      }
    }

    perms.set(c.id, p);
  }

  return { channels, perms };
}

/**
 * Express middleware factory: ensures the authenticated user has `permission`
 * on the channel referenced by `req.params[paramName]` (default "channelId").
 *
 * Attaches `req.discussionChannelPermissions` (BigInt) on success.
 */
export function requireChannelPermission(permissionBit, paramName = "channelId") {
  const bit = BigInt(permissionBit);
  return async function requireChannelPermissionMiddleware(req, res, next) {
    try {
      const userId = Number(req.user?.id ?? req.user?.sub);
      if (!Number.isInteger(userId) || userId <= 0)
        return res.status(401).json({ error: "Unauthorized" });
      const rawId = req.params[paramName];
      const channelId = Number(rawId);
      if (!Number.isInteger(channelId) || channelId <= 0) {
        return res.status(400).json({ error: "Invalid channel id" });
      }
      const perms = await computeChannelPermissions({ userId, channelId });
      if (!hasPermission(perms, bit)) {
        return res.status(403).json({ error: "Forbidden", code: "DISCUSSION_PERMISSION_DENIED" });
      }
      req.discussionChannelPermissions = perms;
      req.discussionChannelId = channelId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Variant for server-level permissions (e.g. MANAGE_SERVER, CREATE_INVITE).
 * Uses the server's EVERYONE role + the user's system role to compute perms,
 * with SUPER_ADMIN and server owner short-circuiting to ALL.
 */
export async function computeServerPermissions({ userId, serverId, prismaClient = prisma }) {
  const server = await prismaClient.discussionGroup.findUnique({
    where: { id: serverId },
    select: { id: true, ownerId: true, kind: true },
  });
  if (!server) return 0n;

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { id: true, role: { select: { name: true } } },
  });
  if (!user) return 0n;
  const globalRole = String(user.role?.name || "").toUpperCase();
  if (globalRole === "SUPER_ADMIN") return PERMISSION_ALL;
  if (server.ownerId === userId) return PERMISSION_ALL;

  const [systemRoles, membership] = await Promise.all([
    prismaClient.discussionRole.findMany({
      where: { serverId, isSystem: true },
      select: { systemKey: true, permissions: true },
    }),
    prismaClient.discussionGroupMembership.findFirst({
      where: { groupId: serverId, userId, leftAt: null },
      select: { role: true, isActive: true },
    }),
  ]);
  const everyone = systemRoles.find((r) => r.systemKey === SYSTEM_ROLE_KEYS.EVERYONE);
  let perms = everyone ? BigInt(everyone.permissions) : SYSTEM_ROLE_DEFAULTS[SYSTEM_ROLE_KEYS.EVERYONE];

  // Club servers route through membership.role; academic servers through the
  // global role mapping. Same rule as computeChannelPermissions.
  const isClubServer = server.kind === 'USER_SERVER';
  const userSystemKey = isClubServer
    ? (membership?.role && membership.isActive !== false
        ? mapClubMembershipRoleToSystemKey(membership.role)
        : null)
    : mapGlobalRoleToSystemRoleKey(globalRole);
  if (userSystemKey) {
    const r = systemRoles.find((sr) => sr.systemKey === userSystemKey);
    if (r) perms |= BigInt(r.permissions);
    else if (SYSTEM_ROLE_DEFAULTS[userSystemKey] != null)
      perms |= SYSTEM_ROLE_DEFAULTS[userSystemKey];
  }
  if ((perms & PERMISSION_ADMINISTRATOR) !== 0n) return PERMISSION_ALL;
  return perms;
}

export function requireServerPermission(permissionBit, paramName = "serverId") {
  const bit = BigInt(permissionBit);
  return async function requireServerPermissionMiddleware(req, res, next) {
    try {
      const userId = Number(req.user?.id ?? req.user?.sub);
      if (!Number.isInteger(userId) || userId <= 0)
        return res.status(401).json({ error: "Unauthorized" });
      const serverId = Number(req.params[paramName]);
      if (!Number.isInteger(serverId) || serverId <= 0) {
        return res.status(400).json({ error: "Invalid server id" });
      }
      const perms = await computeServerPermissions({ userId, serverId });
      if (!hasPermission(perms, bit)) {
        return res.status(403).json({ error: "Forbidden", code: "DISCUSSION_PERMISSION_DENIED" });
      }
      req.discussionServerPermissions = perms;
      req.discussionServerId = serverId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
