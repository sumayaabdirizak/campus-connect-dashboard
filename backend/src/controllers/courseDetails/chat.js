import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import { getIo } from "../../socket/hub.js";

const router = Router();

const MESSAGE_PAGE_SIZE = 50;
const CHAT_UPLOAD_DIR = './uploads/chat';
const CHAT_FILE_LIMIT = 10 * 1024 * 1024; // 10 MB — chat is for quick shares, not large files.

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(CHAT_UPLOAD_DIR)) fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
    cb(null, CHAT_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: CHAT_FILE_LIMIT } });

const senderSelect = { select: { id: true, full_name: true } };
const replySelect = {
  select: {
    id: true,
    content: true,
    senderId: true,
    sender: senderSelect,
  },
};
const messageInclude = {
  sender: senderSelect,
  replyTo: replySelect,
  attachments: true,
  mentions: { select: { userId: true } },
};

async function ensureRoom(courseOfferingId) {
  const existing = await prisma.chatRoom.findFirst({
    where: { courseOfferingId },
  });
  if (existing) return existing;
  return prisma.chatRoom.create({
    data: { name: 'Course Chat', courseOfferingId },
  });
}

/// Resolve `@firstname.lastname` style tokens to enrolled-user ids. We match
/// against full_name slugified, so "Sara Smith" → "sara.smith". Returns
/// distinct userIds (excluding the sender so people can't "@" themselves).
async function resolveMentions(content, courseOfferingId, senderId) {
  const matches = Array.from(content.matchAll(/@([a-z0-9][\w.\-]{0,40})/gi)).map((m) =>
    m[1].toLowerCase()
  );
  if (matches.length === 0) return [];
  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      section: {
        include: {
          studentRegistrations: { include: { student: { select: { id: true, full_name: true } } } },
        },
      },
      teacher: { select: { id: true, full_name: true } },
    },
  });
  if (!offering) return [];
  const candidates = [
    ...(offering.section?.studentRegistrations.map((r) => r.student) ?? []),
    ...(offering.teacher ? [offering.teacher] : []),
  ];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  const found = new Set();
  for (const token of matches) {
    const hit = candidates.find((u) => slug(u.full_name) === token);
    if (hit && hit.id !== senderId) found.add(hit.id);
  }
  return Array.from(found);
}

router.get('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
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
    courseOfferingId: room.courseOfferingId,
    messages,
    nextCursor,
    hasMore,
  });
}));

router.post('/:courseOfferingId/messages', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  const { content, replyToId } = req.body ?? {};
  if (!content || typeof content !== 'string' || !content.trim()) {
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
  const mentionUserIds = await resolveMentions(trimmed, courseOfferingId, senderId);

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

  // Broadcast over socket so subscribed clients see edits/deletes without polling.
  const io = getIo();
  if (io) io.to(`course_${courseOfferingId}`).emit('new_message', message);

  res.json(message);
}));

router.patch('/messages/:messageId', auth, asyncHandler(async (req, res) => {
  const messageId = parseInt(req.params.messageId, 10);
  const { content } = req.body ?? {};
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ message: 'content is required' });
  }
  const existing = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { room: { select: { courseOfferingId: true } } },
  });
  if (!existing) return res.status(404).json({ message: 'Message not found' });
  if (existing.senderId !== req.user.id) {
    return res.status(403).json({ message: 'Only the sender can edit this message' });
  }

  const trimmed = content.trim();
  // Re-parse mentions on edit so removing an @-name also drops the row.
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
  if (io && existing.room.courseOfferingId) {
    io.to(`course_${existing.room.courseOfferingId}`).emit('message_updated', updated);
  }

  res.json(updated);
}));

router.delete('/messages/:messageId', auth, asyncHandler(async (req, res) => {
  const messageId = parseInt(req.params.messageId, 10);
  const existing = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { room: { select: { courseOfferingId: true } } },
  });
  if (!existing) return res.status(404).json({ message: 'Message not found' });
  if (existing.senderId !== req.user.id) {
    return res.status(403).json({ message: 'Only the sender can delete this message' });
  }

  await prisma.chatMessage.delete({ where: { id: messageId } });

  const io = getIo();
  if (io && existing.room.courseOfferingId) {
    io.to(`course_${existing.room.courseOfferingId}`).emit('message_deleted', { id: messageId });
  }

  res.json({ success: true });
}));

router.post(
  '/messages/:messageId/attachments',
  auth,
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    const messageId = parseInt(req.params.messageId, 10);
    const files = req.files ?? [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { room: { select: { courseOfferingId: true } } },
    });
    if (!message) {
      for (const f of files) try { fs.unlinkSync(f.path); } catch {}
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.senderId !== req.user.id) {
      for (const f of files) try { fs.unlinkSync(f.path); } catch {}
      return res.status(403).json({ message: 'Only the sender can attach files' });
    }
    const hostBase = `${req.protocol}://${req.get('host')}`;
    const created = await prisma.$transaction(
      files.map((f) =>
        prisma.chatAttachment.create({
          data: {
            messageId,
            name: f.originalname,
            url: `${hostBase}/uploads/chat/${f.filename}`,
            size: f.size,
            mimeType: f.mimetype,
          },
        })
      )
    );

    // Push the updated message to all subscribers so attachments appear inline.
    const updated = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: messageInclude,
    });
    const io = getIo();
    if (io && message.room.courseOfferingId) {
      io.to(`course_${message.room.courseOfferingId}`).emit('message_updated', updated);
    }

    res.status(201).json({ count: created.length, attachments: created });
  })
);

export default router;
