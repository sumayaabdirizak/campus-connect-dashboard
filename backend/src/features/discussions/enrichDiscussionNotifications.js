import { prisma } from "../../db/prisma.js";

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
  const groupIds = new Set();
  const channelIds = new Set();

  for (const notification of notifications) {
    const payload = asObject(notification.payload);
    const messageId = finiteId(notification.messageId) ?? finiteId(payload.messageId);
    const groupId = finiteId(notification.groupId) ?? finiteId(payload.groupId);
    const channelId = finiteId(payload.channelId);
    if (messageId) messageIds.add(messageId);
    if (groupId) groupIds.add(groupId);
    if (channelId) channelIds.add(channelId);
  }

  const [messages, groups, channels] = await Promise.all([
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
    groupIds.size
      ? prisma.discussionGroup.findMany({
          where: { id: { in: [...groupIds] } },
          select: { id: true, name: true },
        })
      : [],
    channelIds.size
      ? prisma.discussionChannel.findMany({
          where: { id: { in: [...channelIds] } },
          select: { id: true, name: true, slug: true, serverId: true },
        })
      : [],
  ]);

  const messageById = new Map(messages.map((message) => [message.id, message]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const channelById = new Map(channels.map((channel) => [channel.id, channel]));

  return notifications.map((notification) => {
    const payload = asObject(notification.payload);
    const messageId = finiteId(notification.messageId) ?? finiteId(payload.messageId);
    const message = messageId ? messageById.get(messageId) : null;
    const channelId = finiteId(payload.channelId) ?? finiteId(message?.channelId);
    const groupId =
      finiteId(notification.groupId) ??
      finiteId(payload.groupId) ??
      finiteId(message?.groupId) ??
      finiteId(channelId ? channelById.get(channelId)?.serverId : null);
    const channel = channelId ? channelById.get(channelId) : null;
    const group = groupId ? groupById.get(groupId) : null;

    const messageSenderName = message?.isAnonymous
      ? "Anonymous"
      : message?.sender?.full_name ?? payload.senderName ?? payload.reactorName ?? null;

    return {
      ...notification,
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
