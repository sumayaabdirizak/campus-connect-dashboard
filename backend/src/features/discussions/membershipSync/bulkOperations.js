import { prisma } from "../../../db/prisma.js";
import {
  ensureDiscussionGroupForScope,
  gatherUserIdsForDiscussionScopeRefresh,
} from "../groupProvisioning.service.js";
import { resolveScopeDisplayName } from "./helpers.js";
import { syncDiscussionMembershipsForUser } from "./syncDiscussionMembershipsForUser.js";

export async function syncDiscussionMembershipsForUsers(userIds, prismaClient = prisma, options = {}) {
  const uniqueIds = Array.from(new Set((userIds || []).map((id) => Number(id)).filter(Boolean)));
  const results = [];
  for (const id of uniqueIds) {
    results.push(await syncDiscussionMembershipsForUser(id, prismaClient, options));
  }
  return results;
}

export async function refreshDiscussionMembershipsForScope(
  { scopeType, scopeId },
  prismaClient = prisma
) {
  const st = String(scopeType || "").toUpperCase();
  const sid = Number(scopeId);
  const name = await resolveScopeDisplayName(prismaClient, st, sid);
  await ensureDiscussionGroupForScope({
    scopeType: st,
    scopeId: sid,
    name,
    prismaClient,
  });
  const userIds = await gatherUserIdsForDiscussionScopeRefresh(prismaClient, st, sid);
  await syncDiscussionMembershipsForUsers(userIds, prismaClient);
}

export async function deactivateDiscussionMembershipsForUser(userId, prismaClient = prisma) {
  const numericUserId = Number(userId);
  const groups = await prismaClient.discussionGroupMembership.findMany({
    where: { userId: numericUserId, leftAt: null },
    select: { groupId: true },
  });
  await prismaClient.discussionGroupMembership.updateMany({
    where: { userId: numericUserId, leftAt: null },
    data: {
      isActive: false,
      leftAt: new Date(),
    },
  });
  if (groups.length > 0) {
    await prismaClient.discussionGroup.updateMany({
      where: { id: { in: groups.map((g) => g.groupId) } },
      data: { e2eeRotationRequired: true },
    });
  }
}

export async function runDiscussionMembershipNightlySync(prismaClient = prisma) {
  const users = await prismaClient.user.findMany({
    select: { id: true },
    where: {
      OR: [
        { studentProfile: { isNot: null } },
        { lecturerProfile: { isNot: null } },
        { deanProfile: { isNot: null } },
      ],
    },
  });
  return syncDiscussionMembershipsForUsers(users.map((u) => u.id), prismaClient);
}
