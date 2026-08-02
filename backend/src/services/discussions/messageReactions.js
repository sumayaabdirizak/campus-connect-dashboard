import { prisma } from "../../db/prisma.js";
import { getIo } from "../../socket/hub.js";

export async function loadReactionsForMessage(messageId) {
  return prisma.discussionMessageReaction.findMany({
    where: { messageId },
    include: { user: { select: { id: true, full_name: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export async function emitReactionSocket(messageId, event, payload) {
  const msg = await prisma.discussionMessage.findUnique({
    where: { id: messageId },
    select: { channelId: true, groupDmId: true },
  });
  if (!msg) return;
  const io = getIo();
  if (!io) return;
  if (msg.channelId) {
    io.to(`channel:${msg.channelId}`).emit(event, payload);
  }
  if (msg.groupDmId) {
    io.to(`groupdm:${msg.groupDmId}`).emit(event, payload);
  }
}
