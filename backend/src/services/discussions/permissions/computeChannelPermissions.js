import { prisma } from "../../../db/prisma.js";
import { userMayAccessDiscussionChannelScope } from "../channelScopeAccess.js";
import { PERMISSION_BITS, SCOPE_DENIED_MASK } from "./constants.js";
import {
  applyMemberOverwrites,
  applyRoleOverwrites,
  buildEffectiveRoleIds,
  computeBasePermissions,
  resolveUserSystemKey,
  shortCircuitIfAdmin,
} from "./resolveBasePermissions.js";

const B = PERMISSION_BITS;

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
  const adminPerms = shortCircuitIfAdmin({
    globalRole,
    ownerId: channel.server.ownerId,
    userId,
    perms: 0n,
  });
  if (adminPerms != null) return adminPerms;

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

  const userSystemKey = resolveUserSystemKey({
    serverKind: channel.server?.kind,
    globalRole,
    membership,
  });
  const { everyone, perms: basePerms } = computeBasePermissions({ systemRoles, userSystemKey });
  const adminAfterBase = shortCircuitIfAdmin({
    globalRole,
    ownerId: channel.server.ownerId,
    userId,
    perms: basePerms,
  });
  if (adminAfterBase != null) return adminAfterBase;

  const effectiveRoleIds = buildEffectiveRoleIds({ everyone, systemRoles, userSystemKey });
  let perms = applyRoleOverwrites(basePerms, roleOverwrites, effectiveRoleIds);
  perms = applyMemberOverwrites(perms, memberOverwrites);

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
    // Hybrid faculty servers: legacy group membership is translated into
    // MEMBER overwrites (VIEW/SEND/…). Those must win over the academic
    // enrollment/teaching scope filter, or inbox links to batch/section
    // channels 403 for members who were synced via DiscussionGroupMembership.
    const memberAllow = memberOverwrites.reduce(
      (mask, row) => mask | BigInt(row.allow ?? 0),
      0n
    );
    const memberGrantsView = (memberAllow & B.VIEW_CHANNEL) !== 0n;
    if (!inScope && !memberGrantsView) perms &= ~SCOPE_DENIED_MASK;
  }

  return perms;
}
