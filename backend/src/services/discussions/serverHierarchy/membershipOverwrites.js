import { prisma } from "../../../db/prisma.js";
import { PERMISSION_BITS } from "../permissions/constants.js";
import { MEMBER_ALLOW_MASK, STAFF_BONUS_MASK, staffMemberRoles } from "./constants.js";

const B = PERMISSION_BITS;

export async function translateMembershipsToOverwrites(
  legacyGroup,
  channelId,
  prismaClient = prisma,
) {
  const tx = prismaClient;
  const memberships = await tx.discussionGroupMembership.findMany({
    where: { groupId: legacyGroup.id, leftAt: null },
    select: { userId: true, role: true, isActive: true, canPost: true, canModerate: true },
  });
  const staff = staffMemberRoles();
  let count = 0;

  for (const m of memberships) {
    if (m.isActive === false) continue;
    let allow = MEMBER_ALLOW_MASK;
    if (staff.has(String(m.role).toUpperCase()) || m.canModerate) {
      allow |= STAFF_BONUS_MASK;
    }
    if (!m.canPost) {
      allow &= ~B.SEND_MESSAGES;
      allow &= ~B.SEND_MESSAGES_IN_THREADS;
    }
    await tx.discussionPermissionOverwrite.upsert({
      where: {
        channelId_targetType_targetId: {
          channelId,
          targetType: "MEMBER",
          targetId: m.userId,
        },
      },
      create: {
        channelId,
        targetType: "MEMBER",
        targetId: m.userId,
        allow,
        deny: 0n,
      },
      update: { allow, deny: 0n },
    });
    count += 1;
  }
  return count;
}
