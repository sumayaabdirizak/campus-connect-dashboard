import { prisma } from "../../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES, toDiscussionGroupKey } from "../policy.js";
import {
  ensureChannelForLegacyScopeGroup,
  ensureFacultyServerSkeleton,
} from "../serverHierarchy.service.js";
import { getDefaultMembersForScope } from "./defaultMembers/index.js";
import { upsertMembership } from "./membershipUpsert.js";
import { mergeMembersByHighestRole } from "./roleHelpers.js";

export async function gatherUserIdsForDiscussionScopeRefresh(prismaClient, scopeType, scopeId) {
  const normalizedScopeType = String(scopeType || "").toUpperCase();
  const numericScopeId = Number(scopeId);
  const members = await getDefaultMembersForScope(prismaClient, {
    scopeType: normalizedScopeType,
    scopeId: numericScopeId,
  });
  const ids = new Set(members.map((m) => m.userId));
  const group = await prismaClient.discussionGroup.findUnique({
    where: {
      scopeType_scopeId: { scopeType: normalizedScopeType, scopeId: numericScopeId },
    },
    select: { id: true },
  });
  if (group) {
    const existing = await prismaClient.discussionGroupMembership.findMany({
      where: { groupId: group.id, leftAt: null },
      select: { userId: true },
    });
    for (const row of existing) {
      ids.add(row.userId);
    }
  }
  return [...ids];
}

export async function ensureDiscussionGroupForScope({
  scopeType,
  scopeId,
  name,
  prismaClient = prisma,
}) {
  const normalizedScopeType = String(scopeType || "").toUpperCase();
  const numericScopeId = Number(scopeId);
  const groupKey = toDiscussionGroupKey(normalizedScopeType, numericScopeId);
  const client = prismaClient;
  const group = await client.discussionGroup.upsert({
    where: { scopeType_scopeId: { scopeType: normalizedScopeType, scopeId: numericScopeId } },
    create: {
      scopeType: normalizedScopeType,
      scopeId: numericScopeId,
      groupKey,
      name,
    },
    update: {
      name,
      groupKey,
    },
  });

  const defaultMembers = mergeMembersByHighestRole(
    await getDefaultMembersForScope(client, {
      scopeType: normalizedScopeType,
      scopeId: numericScopeId,
    })
  );

  for (const member of defaultMembers) {
    await upsertMembership(client, {
      groupId: group.id,
      userId: member.userId,
      role: member.role,
      scopeType: normalizedScopeType,
    });
  }

  if (normalizedScopeType === DISCUSSION_SCOPE_TYPES.FACULTY) {
    await ensureFacultyServerSkeleton(group, client);
  } else if (
    normalizedScopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT ||
    normalizedScopeType === DISCUSSION_SCOPE_TYPES.BATCH ||
    normalizedScopeType === DISCUSSION_SCOPE_TYPES.SECTION
  ) {
    await ensureChannelForLegacyScopeGroup(group, client);
  }

  return group;
}
