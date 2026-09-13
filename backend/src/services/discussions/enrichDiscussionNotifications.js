import { prisma } from "../../db/prisma.js";
import { isUuidShaped } from "./publicIdResolution.js";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function finiteId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function snippetFor(message) {
  const text = (message?.content || "").trim();
  if (!text) {
    if (message?.ciphertext) return "Encrypted message";
    if (message?.deletedAt) return "Deleted message";
    return null;
  }
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

export async function enrichDiscussionNotificationsForApi(_req, _userId, notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];

  const messageIds = new Set();
  // channelId only ever arrives as a publicId (UUID) in the payload — never a raw int.
  const channelPublicIds = new Set();

  for (const notification of notifications) {
    const payload = asObject(notification.payload);
    const messageId = finiteId(notification.messageId) ?? finiteId(payload.messageId);
    if (messageId) messageIds.add(messageId);
    if (isUuidShaped(payload.channelId)) channelPublicIds.add(payload.channelId);
  }

  const [messages, channels] = await Promise.all([
    messageIds.size
      ? prisma.discussionMessage.findMany({
          where: { id: { in: [...messageIds] } },
          select: {
            id: true,
            groupId: true,
            channelId: true,
            content: true,
            ciphertext: true,
            deletedAt: true,
            isAnonymous: true,
            sender: { select: { id: true, full_name: true } },
          },
        })
      : [],
    channelPublicIds.size
      ? prisma.discussionChannel.findMany({
          where: { publicId: { in: [...channelPublicIds] } },
          select: { id: true, publicId: true, name: true, slug: true, serverId: true },
        })
      : [],
  ]);

  const messageById = new Map(messages.map((message) => [message.id, message]));
  const channelByPublicId = new Map(channels.map((channel) => [channel.publicId, channel]));
  // Also index by the message's own numeric channelId, for notifications whose
  // payload predates the UUID migration and only carries the message row.
  const channelByIntId = new Map(channels.map((channel) => [channel.id, channel]));

  const groupIntIds = new Set();
  for (const notification of notifications) {
    const groupId = finiteId(notification.groupId);
    if (groupId) groupIntIds.add(groupId);
  }
  const groups = groupIntIds.size
    ? await prisma.discussionGroup.findMany({
        where: { id: { in: [...groupIntIds] } },
        select: { id: true, publicId: true, name: true },
      })
    : [];
  const groupByIntId = new Map(groups.map((group) => [group.id, group]));

  return notifications.map((notification) => {
    const payload = asObject(notification.payload);
    const messageId = finiteId(notification.messageId) ?? finiteId(payload.messageId);
    const message = messageId ? messageById.get(messageId) : null;
    const channel = isUuidShaped(payload.channelId)
      ? channelByPublicId.get(payload.channelId)
      : message?.channelId
        ? channelByIntId.get(message.channelId)
        : null;
    const group = finiteId(notification.groupId)
      ? groupByIntId.get(finiteId(notification.groupId))
      : null;

    const messageSenderName = message?.isAnonymous
      ? "Anonymous"
      : message?.sender?.full_name ?? payload.senderName ?? payload.reactorName ?? null;

    return {
      ...notification,
      groupId: group?.publicId ?? null,
      payload: Object.keys(payload).length > 0 ? payload : null,
      display: {
        channelSlug: channel?.slug ?? payload.channelSlug ?? null,
        channelHash: channel?.name ? `#${channel.name}` : null,
        channelName: channel?.name ?? null,
        groupLabel: group?.name ?? null,
        snippet: snippetFor(message),
        messageSenderName,
      },
    };
  });
}
