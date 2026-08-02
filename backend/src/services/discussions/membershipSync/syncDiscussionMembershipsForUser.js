import { prisma } from "../../../db/prisma.js";
import {
  DISCUSSION_SCOPE_TYPES,
  getDefaultDiscussionPermissions,
} from "../policy.js";
import { ensureDiscussionGroupForScope } from "../groupProvisioning.service.js";
import { translateMembershipsToOverwrites } from "../serverHierarchy.service.js";
import { buildDesiredScopesForUser, userSyncSelect } from "./buildDesiredScopes.js";
import { resolveScopeDisplayName, toScopeTuple } from "./helpers.js";

export async function syncDiscussionMembershipsForUser(userId, prismaClient = prisma, options = {}) {
  const { skipGroupProvisioning = false } = options;
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error(`Invalid userId: ${userId}`);
  }

  // Login/refresh sync must stay light: do not re-provision every default
  // member of a batch/section inside this transaction (that often times out
  // and leaves students stuck with Faculty+Department only).
  return prismaClient.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: numericUserId },
        select: userSyncSelect,
      });

      if (!user) return { userId: numericUserId, syncedGroups: 0, disabledOnly: true };

      const desiredByScope = await buildDesiredScopesForUser(tx, user);

      const desiredGroupIds = new Set();
      const membershipsToUpsert = [];
      for (const [k, role] of desiredByScope.entries()) {
        const { scopeType, scopeId } = toScopeTuple(k);
        let group;
        if (skipGroupProvisioning) {
          group = await tx.discussionGroup.findUnique({
            where: { scopeType_scopeId: { scopeType, scopeId } },
            select: { id: true, scopeType: true, status: true },
          });
          if (!group) {
            throw new Error(
              `Missing DiscussionGroup for ${scopeType} ${scopeId}. Run group backfill (ensureDiscussionGroupForScope) first.`
            );
          }
          if (String(group.status || "").toUpperCase() !== "ACTIVE") {
            group = await tx.discussionGroup.update({
              where: { id: group.id },
              data: { status: "ACTIVE", archivedAt: null },
              select: { id: true, scopeType: true, status: true },
            });
          }
        } else {
          const name = await resolveScopeDisplayName(tx, scopeType, scopeId);
          group = await ensureDiscussionGroupForScope({
            scopeType,
            scopeId,
            name,
            prismaClient: tx,
            skipDefaultMembers: true,
          });
        }
        desiredGroupIds.add(group.id);
        membershipsToUpsert.push({ groupId: group.id, role, scopeType: group.scopeType });
      }

      const isUserActive = String(user.status || "").toUpperCase() === "ACTIVE";

      for (const item of membershipsToUpsert) {
        const perms = getDefaultDiscussionPermissions({
          scopeType: item.scopeType,
          role: item.role,
        });
        await tx.discussionGroupMembership.upsert({
          where: { groupId_userId: { groupId: item.groupId, userId: numericUserId } },
          create: {
            groupId: item.groupId,
            userId: numericUserId,
            role: item.role,
            canPost: perms.canPost,
            canModerate: perms.canModerate,
            isActive: isUserActive,
            leftAt: isUserActive ? null : new Date(),
          },
          update: {
            role: item.role,
            canPost: perms.canPost,
            canModerate: perms.canModerate,
            isActive: isUserActive,
            leftAt: isUserActive ? null : new Date(),
          },
        });
      }

      const legacyScopeTypes = new Set([
        DISCUSSION_SCOPE_TYPES.DEPARTMENT,
        DISCUSSION_SCOPE_TYPES.BATCH,
        DISCUSSION_SCOPE_TYPES.SECTION,
      ]);
      const refreshedLegacyGroupIds = new Set();
      for (const item of membershipsToUpsert) {
        if (!legacyScopeTypes.has(String(item.scopeType || "").toUpperCase())) continue;
        if (refreshedLegacyGroupIds.has(item.groupId)) continue;
        const lg = await tx.discussionGroup.findUnique({ where: { id: item.groupId } });
        const ch = await tx.discussionChannel.findFirst({
          where: { legacyGroupId: item.groupId },
          select: { id: true },
        });
        if (lg && ch?.id) {
          await translateMembershipsToOverwrites(lg, ch.id, tx);
          refreshedLegacyGroupIds.add(item.groupId);
        }
      }

      const existingMemberships = await tx.discussionGroupMembership.findMany({
        where: { userId: numericUserId, leftAt: null },
        select: { groupId: true },
      });

      for (const membership of existingMemberships) {
        if (!desiredGroupIds.has(membership.groupId)) {
          await tx.discussionGroupMembership.update({
            where: {
              groupId_userId: {
                groupId: membership.groupId,
                userId: numericUserId,
              },
            },
            data: {
              leftAt: new Date(),
              isActive: false,
            },
          });
          await tx.discussionGroup.update({
            where: { id: membership.groupId },
            data: { e2eeRotationRequired: true },
          });
        }
      }

      return {
        userId: numericUserId,
        syncedGroups: desiredGroupIds.size,
        userStatus: user.status,
      };
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
}
