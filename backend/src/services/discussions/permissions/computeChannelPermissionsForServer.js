import { prisma } from "../../../db/prisma.js";
import { userMayAccessDiscussionChannelScope } from "../channelScopeAccess.js";
import {
  PERMISSION_ADMINISTRATOR,
  PERMISSION_ALL,
  PERMISSION_BITS,
  SCOPE_DENIED_MASK,
} from "./constants.js";
import {
  applyMemberOverwrites,
  buildEffectiveRoleIds,
  computeBasePermissions,
  resolveUserSystemKey,
} from "./resolveBasePermissions.js";

const B = PERMISSION_BITS;

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

  const userSystemKey = resolveUserSystemKey({
    serverKind: server.kind,
    globalRole,
    membership,
  });
  const { everyone, perms: basePerms } = computeBasePermissions({ systemRoles, userSystemKey });

  if ((basePerms & PERMISSION_ADMINISTRATOR) !== 0n) {
    return { channels, perms: allMap() };
  }

  const effectiveRoleIds = buildEffectiveRoleIds({ everyone, systemRoles, userSystemKey });

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
      cur = { allowMask: 0n, denyMask: 0n, count: 0 };
      memberOverwritesByCh.set(o.channelId, cur);
    }
    cur.denyMask |= BigInt(o.deny);
    cur.allowMask |= BigInt(o.allow);
    cur.count += 1;
  }

  const scopedChannels = channels.filter((c) => c.scopeType != null && c.scopeId != null);
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
    if (mo) p = applyMemberOverwrites(p, [{ allow: mo.allowMask, deny: mo.denyMask }]);

    if (c.isPrivate) {
      const hasMember = !!mo;
      const hasMembership = !!membership && membership.isActive !== false;
      if (!hasMember && !hasMembership) {
        p &= ~B.VIEW_CHANNEL;
        p &= ~B.READ_MESSAGE_HISTORY;
        p &= ~B.SEND_MESSAGES;
      }
    }

    if (c.scopeType != null && c.scopeId != null) {
      const inScope = scopeAccessByCh.get(c.id) ?? false;
      const memberGrantsView = !!mo && (mo.allowMask & B.VIEW_CHANNEL) !== 0n;
      if (!inScope && !memberGrantsView) p &= ~SCOPE_DENIED_MASK;
    }

    perms.set(c.id, p);
  }

  return { channels, perms };
}
