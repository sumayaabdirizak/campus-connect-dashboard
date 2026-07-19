import { getDefaultDiscussionPermissions } from "../policy.js";

export async function upsertMembership(tx, { groupId, userId, role, scopeType }) {
  const perms = getDefaultDiscussionPermissions({ scopeType, role });
  return tx.discussionGroupMembership.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: {
      groupId,
      userId,
      role,
      canPost: perms.canPost,
      canModerate: perms.canModerate,
      leftAt: null,
    },
    update: {
      role,
      canPost: perms.canPost,
      canModerate: perms.canModerate,
      leftAt: null,
    },
  });
}
