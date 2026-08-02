import { prisma } from "../../db/prisma.js";
import {
  PERMISSION_BITS,
  computeChannelPermissionsForServer,
  hasPermission,
} from "./permissions.js";
import { applyAnonymousSenderPolicy } from "./discussionMessagePublic.js";

export function mapChannelMessagesForViewer(messages, userId, membership) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return messages;
  return messages.map((m) => applyAnonymousSenderPolicy(m, uid, membership));
}

export async function getServerVisibleChannels(serverId, userId) {
  const { channels, perms } = await computeChannelPermissionsForServer({
    userId,
    serverId,
  });
  const visible = [];
  for (const channel of channels) {
    const p = perms.get(channel.id) ?? 0n;
    if (hasPermission(p, PERMISSION_BITS.VIEW_CHANNEL)) {
      visible.push({ ...channel, myPermissions: p.toString() });
    }
  }
  return visible;
}
