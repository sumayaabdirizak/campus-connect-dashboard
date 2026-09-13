import express from 'express';
import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';
import { getIo } from '../../socket/hub.js';
import {
  PERMISSION_BITS,
  computeChannelPermissions,
  hasPermission,
} from '../../services/discussions/permissions.js';
import { getDiscussionCallerUserId } from '../../services/discussions/discussionCaller.js';
import { editChannelMessageSchema } from '../../validation/serverSchemas.js';
import reactionRoutes from './serverMessageReactions.routes.js';
import { resolveMessageRow, buildMessagePublicIdMap, toMessageDto } from '../../controllers/discussions/messageShared.js';

async function channelPublicIdFor(channelId) {
  if (!channelId) return null;
  const row = await prisma.discussionChannel.findUnique({ where: { id: channelId }, select: { publicId: true } });
  return row?.publicId ?? null;
}

const router = express.Router();

// Mount reaction sub-routes
router.use('/', reactionRoutes);

/** PATCH /messages/:messageId — edit message content */
router.patch('/messages/:messageId', async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));
    const message = await resolveMessageRow(req.params.messageId);
    if (!message) return res.status(400).json(apiErrorBody('Invalid messageId', null));
    const messageId = message.id;
    const parseResult = editChannelMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(apiErrorBody('Invalid request body', parseResult.error.issues));
    }
    const fullMessage = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!fullMessage) return res.status(404).json(apiErrorBody('Message not found', null));
    if (fullMessage.deletedAt) return res.status(410).json(apiErrorBody('Message deleted', null));
    if (fullMessage.senderId !== userId) {
      return res.status(403).json(apiErrorBody("Cannot edit other users' messages", null));
    }

    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: { content: parseResult.data.content ?? null, editedAt: new Date() },
    });
    const channelPublicId = await channelPublicIdFor(fullMessage.channelId);
    const publicIdById = await buildMessagePublicIdMap([updated]);
    const updatedDto = { ...toMessageDto(updated, publicIdById), channelId: channelPublicId };

    try {
      const io = getIo();
      if (io && message.channelId) {
        io.to(`channel:${message.channelId}`).emit('message:edit', { message: updatedDto });
      }
    } catch (emitErr) {
      console.warn('Socket emit failed for message:edit', emitErr?.message);
    }
    return res.json({ message: updatedDto });
  } catch (error) {
    console.error('PATCH /discussions/messages/:messageId failed', error);
    return res.status(500).json(apiErrorBody('Failed to edit message', null));
  }
});

/** DELETE /messages/:messageId — soft-delete a message */
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));
    const msgRow = await resolveMessageRow(req.params.messageId);
    if (!msgRow) return res.status(400).json(apiErrorBody('Invalid messageId', null));
    const messageId = msgRow.id;
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!message) return res.status(404).json(apiErrorBody('Message not found', null));
    if (message.deletedAt) return res.json({ message: { ...message, id: msgRow.publicId } });

    const isAuthor = message.senderId === userId;
    if (!isAuthor) {
      if (!message.channelId) return res.status(403).json(apiErrorBody('Forbidden', null));
      const perms = await computeChannelPermissions({ userId, channelId: message.channelId });
      if (!hasPermission(perms, PERMISSION_BITS.MANAGE_MESSAGES)) {
        return res.status(403).json(apiErrorBody('Forbidden', null));
      }
    }
    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
    const channelPublicId = await channelPublicIdFor(message.channelId);
    try {
      const io = getIo();
      if (io && message.channelId) {
        io.to(`channel:${message.channelId}`).emit('message:delete', { messageId: msgRow.publicId, channelId: channelPublicId });
      }
    } catch (emitErr) {
      console.warn('Socket emit failed for message:delete', emitErr?.message);
    }
    const publicIdById = await buildMessagePublicIdMap([updated]);
    return res.json({ message: { ...toMessageDto(updated, publicIdById), channelId: channelPublicId } });
  } catch (error) {
    console.error('DELETE /discussions/messages/:messageId failed', error);
    return res.status(500).json(apiErrorBody('Failed to delete message', null));
  }
});

export default router;
