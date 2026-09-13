import { prisma } from '../../../db/prisma.js';
import { getIo } from '../../../socket/hub.js';
import { courseOfferingRoomName } from '../../../utils/courseOfferingAccess.js';
import { ensureRoom, resolveMentions, MESSAGE_PAGE_SIZE, messageInclude } from './helpers.js';

export async function getChatRoomMessages(req, res) {
  const courseOfferingId = req.courseOffering.id;
  const room = await ensureRoom(courseOfferingId);

  const before = req.query.before ? parseInt(String(req.query.before), 10) : null;
  const where = before ? { roomId: room.id, id: { lt: before } } : { roomId: room.id };

  const page = await prisma.chatMessage.findMany({
    where,
    include: messageInclude,
    orderBy: { id: 'desc' },
    take: MESSAGE_PAGE_SIZE + 1,
  });

  const hasMore = page.length > MESSAGE_PAGE_SIZE;
  const trimmed = hasMore ? page.slice(0, MESSAGE_PAGE_SIZE) : page;
  const messages = trimmed.reverse();
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null;

  res.json({
    id: room.id,
    name: room.name,
    courseOfferingId: req.courseOffering.publicId,
    messages,
    nextCursor,
    hasMore,
  });
}

export async function createMessage(req, res) {
  const courseOfferingId = req.courseOffering.id;
  const { content, replyToId } = req.body ?? {};
  if (typeof content !== 'string') {
    return res.status(400).json({ message: 'content is required' });
  }
  const senderId = req.user.id;
  const room = await ensureRoom(courseOfferingId);

  let safeReplyToId = null;
  if (replyToId != null) {
    const target = await prisma.chatMessage.findUnique({
      where: { id: Number(replyToId) },
      select: { roomId: true },
    });
    if (target?.roomId === room.id) safeReplyToId = Number(replyToId);
  }

  const trimmed = content.trim();
  const mentionUserIds = trimmed
    ? await resolveMentions(trimmed, courseOfferingId, senderId)
    : [];

  const message = await prisma.chatMessage.create({
    data: {
      roomId: room.id,
      senderId,
      content: trimmed,
      replyToId: safeReplyToId,
      mentions: mentionUserIds.length
        ? { create: mentionUserIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: messageInclude,
  });

  const io = getIo();
  const roomName = courseOfferingRoomName(req.courseOffering);
  if (io && roomName) io.to(roomName).emit('new_message', message);

  res.json(message);
}

export async function editMessage(req, res) {
  const messageId = parseInt(req.params.messageId, 10);
  const { content } = req.body ?? {};
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ message: 'content is required' });
  }
  const existing = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { room: { select: { courseOfferingId: true, courseOffering: { select: { publicId: true } } } } },
  });
  if (!existing) return res.status(404).json({ message: 'Message not found' });
  if (existing.senderId !== req.user.id) {
    return res.status(403).json({ message: 'Only the sender can edit this message' });
  }

  const trimmed = content.trim();
  const mentionUserIds = existing.room.courseOfferingId
    ? await resolveMentions(trimmed, existing.room.courseOfferingId, req.user.id)
    : [];

  const updated = await prisma.$transaction(async (tx) => {
    await tx.chatMessageMention.deleteMany({ where: { messageId } });
    if (mentionUserIds.length > 0) {
      await tx.chatMessageMention.createMany({
        data: mentionUserIds.map((userId) => ({ messageId, userId })),
      });
    }
    return tx.chatMessage.update({
      where: { id: messageId },
      data: { content: trimmed, editedAt: new Date() },
      include: messageInclude,
    });
  });

  const io = getIo();
  const roomName = courseOfferingRoomName(existing.room.courseOffering);
  if (io && roomName) io.to(roomName).emit('message_updated', updated);

  res.json(updated);
}

export async function deleteMessage(req, res) {
  const messageId = parseInt(req.params.messageId, 10);
  const existing = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { room: { select: { courseOffering: { select: { publicId: true } } } } },
  });
  if (!existing) return res.status(404).json({ message: 'Message not found' });
  if (existing.senderId !== req.user.id) {
    return res.status(403).json({ message: 'Only the sender can delete this message' });
  }

  await prisma.chatMessage.delete({ where: { id: messageId } });

  const io = getIo();
  const roomName = courseOfferingRoomName(existing.room.courseOffering);
  if (io && roomName) io.to(roomName).emit('message_deleted', { id: messageId });

  res.json({ success: true });
}
