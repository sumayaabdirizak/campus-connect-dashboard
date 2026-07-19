import { prisma } from "../../../db/prisma.js";

export const CHANNEL_MSG_INCLUDE = {
  sender: { select: { id: true, full_name: true } },
  attachments: true,
  reactions: { include: { user: { select: { id: true, full_name: true } } } },
};

export async function buildChannelThreadPreviewMap(channelId, rootIds) {
  const previewByRoot = new Map();
  if (rootIds.length === 0) return previewByRoot;

  const [countRows, recentReplies] = await Promise.all([
    prisma.discussionMessage.groupBy({
      by: ["parentMessageId"],
      where: { channelId, deletedAt: null, parentMessageId: { in: rootIds } },
      _count: { id: true },
    }),
    prisma.discussionMessage.findMany({
      where: { channelId, deletedAt: null, parentMessageId: { in: rootIds } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 400,
      select: {
        parentMessageId: true,
        createdAt: true,
        senderId: true,
        isAnonymous: true,
        sender: { select: { id: true, full_name: true } },
      },
    }),
  ]);

  for (const row of countRows) {
    previewByRoot.set(row.parentMessageId, {
      replyCount: row._count.id,
      lastReplyAt: null,
      previewSenders: [],
    });
  }
  for (const r of recentReplies) {
    const pid = r.parentMessageId;
    if (pid == null) continue;
    const pr = previewByRoot.get(pid);
    if (!pr) continue;
    if (!pr.lastReplyAt) pr.lastReplyAt = r.createdAt.toISOString();
    if (pr.previewSenders.length < 3 && (r.senderId || r.isAnonymous)) {
      const sid = r.isAnonymous ? 0 : Number(r.senderId);
      const name = r.isAnonymous ? "Anonymous" : r.sender?.full_name ?? "Member";
      if (!pr.previewSenders.some((s) => s.id === sid && s.full_name === name)) {
        pr.previewSenders.push({ id: sid, full_name: name });
      }
    }
  }
  return previewByRoot;
}
