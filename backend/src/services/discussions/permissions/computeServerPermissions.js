import { prisma } from "../../../db/prisma.js";
import {
  computeBasePermissions,
  resolveUserSystemKey,
  shortCircuitIfAdmin,
} from "./resolveBasePermissions.js";

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
  const adminPerms = shortCircuitIfAdmin({ globalRole, ownerId: server.ownerId, userId, perms: 0n });
  if (adminPerms != null) return adminPerms;

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

  const userSystemKey = resolveUserSystemKey({
    serverKind: server.kind,
    globalRole,
    membership,
  });
  const { perms } = computeBasePermissions({ systemRoles, userSystemKey });

  const adminAfterBase = shortCircuitIfAdmin({
    globalRole,
    ownerId: server.ownerId,
    userId,
    perms,
  });
  if (adminAfterBase != null) return adminAfterBase;

  return perms;
}
