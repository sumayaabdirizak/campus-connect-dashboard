import { prisma } from '../../../db/prisma.js';

export async function toggleReaction(req, res) {
  const postId = parseInt(req.params.postId, 10);
  const { emoji } = req.body ?? {};
  if (!emoji || typeof emoji !== 'string' || emoji.length > 16) {
    return res.status(400).json({ message: 'emoji is required (≤ 16 chars)' });
  }
  const userId = req.user.id;

  const existing = await prisma.coursePostReaction.findUnique({
    where: { postId_userId_emoji: { postId, userId, emoji } },
  });
  if (existing) {
    await prisma.coursePostReaction.delete({ where: { id: existing.id } });
    return res.json({ toggled: 'off', emoji });
  }
  const created = await prisma.coursePostReaction.create({
    data: { postId, userId, emoji },
  });
  res.status(201).json({ toggled: 'on', reaction: created });
}
