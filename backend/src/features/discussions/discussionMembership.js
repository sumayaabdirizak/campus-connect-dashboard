import { prisma } from "../../db/prisma.js";

export async function requireActiveDiscussionMembership(groupId, userId) {
  return prisma.discussionGroupMembership.findFirst({
    where: {
      groupId,
      userId,
      leftAt: null,
      isActive: true,
      group: { status: "ACTIVE" },
    },
    include: {
      group: {
        select: {
          id: true,
          status: true,
          e2eeEnabled: true,
          e2eeCurrentKeyVersion: true,
          e2eeRotationRequired: true,
          kind: true,
          defaultChannelId: true,
        },
      },
    },
  });
}

export function canManageDiscussionGroup(membership) {
  return membership?.canModerate === true;
}

export async function resolveDiscussionE2EERequirement(groupId) {
  const group = await prisma.discussionGroup.findUnique({
    where: { id: groupId },
    select: { e2eeEnabled: true },
  });
  return group?.e2eeEnabled !== false;
}
