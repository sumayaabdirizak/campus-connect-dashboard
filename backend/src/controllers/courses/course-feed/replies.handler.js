import { prisma } from '../../../db/prisma.js';
import { replyAuthor } from './helpers.js';

export async function createReply(req, res) {
  const postId = parseInt(req.params.postId, 10);
  const { content } = req.body ?? {};
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ message: 'content is required' });
  }
  const post = await prisma.coursePost.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const reply = await prisma.coursePostReply.create({
    data: { postId, authorId: req.user.id, content: content.trim() },
    include: { author: replyAuthor },
  });
  res.status(201).json(reply);
}

export async function editReply(req, res) {
  const replyId = parseInt(req.params.replyId, 10);
  const { content } = req.body ?? {};
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ message: 'content is required' });
  }
  const existing = await prisma.coursePostReply.findUnique({ where: { id: replyId } });
  if (!existing) return res.status(404).json({ message: 'Reply not found' });
  if (existing.authorId !== req.user.id) {
    return res.status(403).json({ message: 'Only the author can edit this reply' });
  }
  const updated = await prisma.coursePostReply.update({
    where: { id: replyId },
    data: { content: content.trim() },
    include: { author: replyAuthor },
  });
  res.json(updated);
}

export async function deleteReply(req, res) {
  const replyId = parseInt(req.params.replyId, 10);
  const existing = await prisma.coursePostReply.findUnique({ where: { id: replyId } });
  if (!existing) return res.status(404).json({ message: 'Reply not found' });
  if (existing.authorId !== req.user.id) {
    return res.status(403).json({ message: 'Only the author can delete this reply' });
  }
  await prisma.coursePostReply.delete({ where: { id: replyId } });
  res.json({ success: true });
}
