import express from 'express';
import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';
import { getIo } from '../../socket/hub.js';
import {
  PERMISSION_BITS,
  computeChannelPermissions,
  hasPermission,
} from '../../features/discussions/permissions.js';
import { getDiscussionCallerUserId } from '../../features/discussions/discussionCaller.js';
import { editChannelMessageSchema } from '../../features/discussions/validation/serverSchemas.js';
import reactionRoutes from './serverMessageReactions.routes.js';

const router = express.Router();

// Mount reaction sub-routes
router.use('/', reactionRoutes);

/** PATCH /messages/:messageId — edit message content */
router.patch('/messages/:messageId', async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody('Invalid messageId', null));
    }
    const parseResult = editChannelMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(apiErrorBody('Invalid request body', parseResult.error.issues));
    }
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!message) return res.status(404).json(apiErrorBody('Message not found', null));
    if (message.deletedAt) return res.status(410).json(apiErrorBody('Message deleted', null));
    if (message.senderId !== userId) {
      return res.status(403).json(apiErrorBody("Cannot edit other users' messages", null));
    }

    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: { content: parseResult.data.content ?? null, editedAt: new Date() },
    });

    try {
      const io = getIo();
      if (io && message.channelId) {
        io.to(`channel:${message.channelId}`).emit('message:edit', { message: updated });
      }
    } catch (emitErr) {
      console.warn('Socket emit failed for message:edit', emitErr?.message);
    }
    return res.json({ message: updated });
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
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody('Invalid messageId', null));
    }
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!message) return res.status(404).json(apiErrorBody('Message not found', null));
    if (message.deletedAt) return res.json({ message });

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
    try {
      const io = getIo();
      if (io && message.channelId) {
        io.to(`channel:${message.channelId}`).emit('message:delete', { messageId });
      }
    } catch (emitErr) {
      console.warn('Socket emit failed for message:delete', emitErr?.message);
    }
    return res.json({ message: updated });
  } catch (error) {
    console.error('DELETE /discussions/messages/:messageId failed', error);
    return res.status(500).json(apiErrorBody('Failed to delete message', null));
  }
});

export default router;
