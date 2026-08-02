/**
 * Message reaction route handlers for server/channel messages.
 */
import express from 'express';
import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';
import { assertMessageReactionAllowed } from '../../services/discussions/messageAccess.js';
import { getDiscussionCallerUserId } from '../../services/discussions/discussionCaller.js';
import {
  serverReactionBodySchema,
} from '../../validation/serverSchemas.js';
import {
  loadReactionsForMessage,
  emitReactionSocket,
} from '../../services/discussions/messageReactions.js';
import { resolveMessageRow } from './messageShared.js';

const router = express.Router();

/** GET /messages/:messageId/reactions */
router.get('/messages/:messageId/reactions', async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));
    const msgRow = await resolveMessageRow(req.params.messageId);
    if (!msgRow) {
      return res.status(400).json(apiErrorBody('Invalid messageId', null));
    }
    const messageId = msgRow.id;
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    const reactions = (await loadReactionsForMessage(messageId)).map((r) => ({
      ...r,
      messageId: msgRow.publicId,
    }));
    return res.json({ reactions });
  } catch (error) {
    console.error('GET /discussions/messages/:messageId/reactions failed', error);
    return res.status(500).json(apiErrorBody('Failed to list reactions', null));
  }
});

/** POST /messages/:messageId/reactions */
router.post('/messages/:messageId/reactions', async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));
    const msgRow = await resolveMessageRow(req.params.messageId);
    if (!msgRow) {
      return res.status(400).json(apiErrorBody('Invalid messageId', null));
    }
    const messageId = msgRow.id;
    const parsed = serverReactionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody('Invalid request body', parsed.error.issues));
    }
    const emoji = parsed.data.emoji;
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    try {
      await prisma.discussionMessageReaction.create({ data: { messageId, userId, emoji } });
    } catch (err) {
      if (err?.code === 'P2002') {
        return res.status(409).json(apiErrorBody('Reaction already exists', null));
      }
      throw err;
    }
    const reactions = (await loadReactionsForMessage(messageId)).map((r) => ({
      ...r,
      messageId: msgRow.publicId,
    }));
    const targetMsg = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: {
        senderId: true,
        groupId: true,
        channelId: true,
        group: { select: { publicId: true } },
        channel: { select: { publicId: true } },
      },
    });
    const reactor = await prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true },
    });
    if (targetMsg && targetMsg.senderId !== userId) {
      await prisma.discussionNotification.create({
        data: {
          userId: targetMsg.senderId,
          groupId: targetMsg.groupId,
          messageId,
          type: 'REACTION',
          payload: {
            groupId: targetMsg.group?.publicId ?? null,
            channelId: targetMsg.channel?.publicId ?? null,
            messageId: msgRow.publicId,
            reactorId: userId,
            reactorName: reactor?.full_name ?? null,
            emoji,
          },
        },
      });
    }
    await emitReactionSocket(messageId, 'reaction:update', { messageId: msgRow.publicId, reactions, emoji, userId, action: 'add' });
    return res.status(201).json({ reactions });
  } catch (error) {
    console.error('POST /discussions/messages/:messageId/reactions failed', error);
    return res.status(500).json(apiErrorBody('Failed to add reaction', null));
  }
});

/** DELETE /messages/:messageId/reactions/:emoji */
router.delete('/messages/:messageId/reactions/:emoji', async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));
    const msgRow = await resolveMessageRow(req.params.messageId);
    if (!msgRow) {
      return res.status(400).json(apiErrorBody('Invalid messageId', null));
    }
    const messageId = msgRow.id;
    let emoji;
    try {
      emoji = decodeURIComponent(String(req.params.emoji ?? '')).trim();
    } catch {
      return res.status(400).json(apiErrorBody('Invalid emoji in path', null));
    }
    if (!emoji) return res.status(400).json(apiErrorBody('emoji is required', null));
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    await prisma.discussionMessageReaction.deleteMany({ where: { messageId, userId, emoji } });
    const reactions = (await loadReactionsForMessage(messageId)).map((r) => ({
      ...r,
      messageId: msgRow.publicId,
    }));
    await emitReactionSocket(messageId, 'reaction:update', { messageId: msgRow.publicId, reactions, emoji, userId, action: 'remove' });
    return res.json({ reactions });
  } catch (error) {
    console.error('DELETE /discussions/messages/:messageId/reactions/:emoji failed', error);
    return res.status(500).json(apiErrorBody('Failed to remove reaction', null));
  }
});

/** DELETE /messages/:messageId/reactions (body-based emoji) */
router.delete('/messages/:messageId/reactions', async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));
    const msgRow = await resolveMessageRow(req.params.messageId);
    if (!msgRow) {
      return res.status(400).json(apiErrorBody('Invalid messageId', null));
    }
    const messageId = msgRow.id;
    const parsed = serverReactionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody('Invalid request body', parsed.error.issues));
    }
    const emoji = parsed.data.emoji;
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    await prisma.discussionMessageReaction.deleteMany({ where: { messageId, userId, emoji } });
    const reactions = (await loadReactionsForMessage(messageId)).map((r) => ({
      ...r,
      messageId: msgRow.publicId,
    }));
    await emitReactionSocket(messageId, 'reaction:update', { messageId: msgRow.publicId, reactions, emoji, userId, action: 'remove' });
    return res.json({ reactions });
  } catch (error) {
    console.error('DELETE /discussions/messages/:messageId/reactions failed', error);
    return res.status(500).json(apiErrorBody('Failed to remove reaction', null));
  }
});

export default router;
