import { prisma } from "../../db/prisma.js";

/**
 * Enrich raw DiscussionNotification rows with group/channel labels and a plaintext snippet.
 */
export async function enrichDiscussionNotificationsForApi(_req, userId, rows) {
  void userId;
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const messageIds = [...new Set(rows.map((r) => r.messageId).filter(Boolean).map(Number))];
  const groupIds = [...new Set(rows.map((r) => r.groupId).filter(Boolean).map(Number))];
  const channelIds = [
    ...new Set(
      rows
        .map((r) => {
          const p = r.payload;
          return p && typeof p === "object" && p.channelId != null ? Number(p.channelId) : null;
        })
        .filter((id) => Number.isFinite(id))
    ),
  ];

  const [messages, groups, channels] = await Promise.all([
    messageIds.length
      ? prisma.discussionMessage.findMany({
          where: { id: { in: messageIds } },
          select: {
            id: true,
            content: true,
            ciphertext: true,
            senderId: true,
            sender: { select: { full_name: true } },
          },
        })
      : [],
    groupIds.length
      ? prisma.discussionGroup.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, name: true, groupKey: true },
        })
      : [],
    channelIds.length
      ? prisma.discussionChannel.findMany({
          where: { id: { in: channelIds } },
          select: { id: true, slug: true, name: true, serverId: true },
        })
      : [],
  ]);

  const msgById = new Map(messages.map((m) => [m.id, m]));
  const grpById = new Map(groups.map((g) => [g.id, g]));
  const chById = new Map(channels.map((c) => [c.id, c]));

  return rows.map((n) => {
    const payload = n.payload && typeof n.payload === "object" ? { ...n.payload } : {};
    const cid = payload.channelId != null ? Number(payload.channelId) : null;
    const channel = Number.isFinite(cid) ? chById.get(cid) : null;
    const slugFromPayload = payload.channelSlug != null ? String(payload.channelSlug).replace(/^#/, "") : null;
    const grp = n.groupId != null ? grpById.get(Number(n.groupId)) : null;
    const msg = n.messageId != null ? msgById.get(Number(n.messageId)) : null;
    const rawContent = msg?.content != null ? String(msg.content).trim() : "";
    const snippet = rawContent ? rawContent.slice(0, 220) : msg?.ciphertext ? "(Encrypted message)" : null;
    const effectiveSlug = channel?.slug ?? slugFromPayload;

    return {
      ...n,
      payload,
      display: {
        channelSlug: effectiveSlug,
        channelHash: effectiveSlug ? `#${effectiveSlug}` : null,
        channelName: channel?.name ?? null,
        groupLabel: grp?.name ?? grp?.groupKey ?? null,
        snippet,
        messageSenderName: msg?.sender?.full_name ?? null,
      },
    };
  });
}
