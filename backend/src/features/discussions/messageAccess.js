import { prisma } from "../../db/prisma.js";
import {
  computeChannelPermissions,
  hasPermission,
  PERMISSION_BITS,
} from "./permissions.js";

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Ensure the user may add/remove reactions on this message (view + ADD_REACTIONS for channels;
 * active membership for group DMs and legacy groups).
 *
 * @param {number} userId
 * @param {number} messageId
 */
export async function assertMessageReactionAllowed(userId, messageId) {
  const msg = await prisma.discussionMessage.findUnique({
    where: { id: messageId },
    select: { id: true, deletedAt: true, channelId: true, groupId: true, groupDmId: true },
  });
  if (!msg || msg.deletedAt) throw httpError(404, "Message not found");

  if (msg.channelId) {
    const perms = await computeChannelPermissions({ userId, channelId: msg.channelId });
    if (!hasPermission(perms, PERMISSION_BITS.ADD_REACTIONS)) {
      throw httpError(403, "Forbidden");
    }
    return msg;
  }

  if (msg.groupDmId) {
    const m = await prisma.groupDmMember.findFirst({
      where: { groupDmId: msg.groupDmId, userId, leftAt: null },
    });
    if (!m) throw httpError(403, "Forbidden");
    return msg;
  }

  if (msg.groupId) {
    const mem = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: msg.groupId, userId, leftAt: null, isActive: true },
    });
    if (!mem) throw httpError(403, "Forbidden");
    return msg;
  }

  throw httpError(404, "Message not found");
}
