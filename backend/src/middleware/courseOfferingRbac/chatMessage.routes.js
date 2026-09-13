import {
  fetchOfferingWithScope,
  canAccessOfferingRead,
} from "../../utils/courseOfferingAccess.js";

async function loadChatMessageById(req) {
  const { prisma } = await import("../../db/prisma.js");
  const messageId = parseInt(req.params.messageId, 10);
  if (!Number.isInteger(messageId)) return null;
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { room: { select: { courseOfferingId: true } } },
  });
  if (!message || !message.room?.courseOfferingId) return null;
  const offering = await fetchOfferingWithScope(message.room.courseOfferingId);
  if (!offering) return null;
  req.chatMessage = message;
  req.courseOffering = offering;
  return { message, offering };
}

export function requireChatMessageRead() {
  return async (req, res, next) => {
    const loaded = await loadChatMessageById(req);
    if (!loaded) return res.status(404).json({ message: "Message not found" });
    if (!(await canAccessOfferingRead(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
