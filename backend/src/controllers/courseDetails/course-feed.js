import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

const FEED_UPLOAD_DIR = './uploads/course-feed';
const FEED_FILE_LIMIT = 25 * 1024 * 1024;
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(FEED_UPLOAD_DIR)) fs.mkdirSync(FEED_UPLOAD_DIR, { recursive: true });
    cb(null, FEED_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: FEED_FILE_LIMIT } });

const replyAuthor = { select: { id: true, full_name: true, role: { select: { name: true } } } };

const postInclude = {
  author: { select: { id: true, full_name: true, role: { select: { name: true } } } },
  attachments: true,
  reactions: { select: { id: true, userId: true, emoji: true } },
  replies: {
    orderBy: { created_at: 'asc' },
    include: { author: replyAuthor },
  },
};

router.get('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  if (!Number.isInteger(courseOfferingId)) {
    return res.status(400).json({ message: 'Invalid courseOfferingId' });
  }

  const posts = await prisma.coursePost.findMany({
    where: { courseOfferingId },
    include: postInclude,
    orderBy: [{ isPinned: 'desc' }, { created_at: 'desc' }],
  });

  res.json(posts);
}));

router.post('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  if (!Number.isInteger(courseOfferingId)) {
    return res.status(400).json({ message: 'Invalid courseOfferingId' });
  }
  const { title, content, isImportant = false, isPinned = false, attachments = [] } = req.body ?? {};
  if (!title || !content) {
    return res.status(400).json({ message: 'title and content are required' });
  }

  const post = await prisma.coursePost.create({
    data: {
      courseOfferingId,
      authorId: req.user.id,
      title,
      content,
      isImportant: Boolean(isImportant),
      isPinned: Boolean(isPinned),
      attachments: Array.isArray(attachments) && attachments.length > 0
        ? {
            create: attachments
              .filter((a) => a && a.url && a.name)
              .map((a) => ({
                name: String(a.name),
                url: String(a.url),
                size: Number.isInteger(a.size) ? a.size : null,
                mimeType: a.mimeType ?? null,
              })),
          }
        : undefined,
    },
    include: postInclude,
  });

  res.status(201).json(post);
}));

router.patch('/post/:postId', auth, asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  if (!Number.isInteger(postId)) {
    return res.status(400).json({ message: 'Invalid postId' });
  }
  const existing = await prisma.coursePost.findUnique({ where: { id: postId } });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.authorId !== req.user.id) {
    return res.status(403).json({ message: 'Only the author can edit this post' });
  }

  const { title, content, isImportant, isPinned } = req.body ?? {};
  const post = await prisma.coursePost.update({
    where: { id: postId },
    data: {
      ...(typeof title === 'string' && { title }),
      ...(typeof content === 'string' && { content }),
      ...(typeof isImportant === 'boolean' && { isImportant }),
      ...(typeof isPinned === 'boolean' && { isPinned }),
    },
    include: postInclude,
  });

  res.json(post);
}));

router.delete('/post/:postId', auth, asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  if (!Number.isInteger(postId)) {
    return res.status(400).json({ message: 'Invalid postId' });
  }
  const existing = await prisma.coursePost.findUnique({ where: { id: postId } });
  if (!existing) return res.status(404).json({ message: 'Not found' });
  if (existing.authorId !== req.user.id) {
    return res.status(403).json({ message: 'Only the author can delete this post' });
  }

  await prisma.coursePost.delete({ where: { id: postId } });
  res.json({ success: true });
}));

// ────────────────────────────────────────────────────────────────────────────
// Attachments — multipart upload + delete. Storage is shared via `/uploads`.
// ────────────────────────────────────────────────────────────────────────────

router.post(
  '/post/:postId/attachments',
  auth,
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    const files = req.files ?? [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const post = await prisma.coursePost.findUnique({ where: { id: postId } });
    if (!post) {
      for (const f of files) try { fs.unlinkSync(f.path); } catch {}
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.authorId !== req.user.id) {
      for (const f of files) try { fs.unlinkSync(f.path); } catch {}
      return res.status(403).json({ message: 'Only the author can attach files' });
    }
    const hostBase = `${req.protocol}://${req.get('host')}`;
    const created = await prisma.$transaction(
      files.map((f) =>
        prisma.coursePostAttachment.create({
          data: {
            postId,
            name: f.originalname,
            url: `${hostBase}/uploads/course-feed/${f.filename}`,
            size: f.size,
            mimeType: f.mimetype,
          },
        })
      )
    );
    res.status(201).json({ count: created.length, attachments: created });
  })
);

router.delete('/attachments/:attachmentId', auth, asyncHandler(async (req, res) => {
  const attachmentId = parseInt(req.params.attachmentId, 10);
  const att = await prisma.coursePostAttachment.findUnique({
    where: { id: attachmentId },
    include: { post: { select: { authorId: true } } },
  });
  if (!att) return res.status(404).json({ message: 'Not found' });
  if (att.post.authorId !== req.user.id) {
    return res.status(403).json({ message: 'Only the author can remove this attachment' });
  }
  await prisma.coursePostAttachment.delete({ where: { id: attachmentId } });
  try {
    const filename = att.url.split('/').pop();
    if (filename) fs.unlinkSync(path.join(FEED_UPLOAD_DIR, filename));
  } catch {}
  res.json({ success: true });
}));

// ────────────────────────────────────────────────────────────────────────────
// Reactions — toggle a single (post, user, emoji) tuple.
// ────────────────────────────────────────────────────────────────────────────

router.post('/post/:postId/reactions', auth, asyncHandler(async (req, res) => {
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
}));

// ────────────────────────────────────────────────────────────────────────────
// Replies — one-level deep thread under a post.
// ────────────────────────────────────────────────────────────────────────────

router.post('/post/:postId/replies', auth, asyncHandler(async (req, res) => {
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
}));

router.patch('/replies/:replyId', auth, asyncHandler(async (req, res) => {
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
}));

router.delete('/replies/:replyId', auth, asyncHandler(async (req, res) => {
  const replyId = parseInt(req.params.replyId, 10);
  const existing = await prisma.coursePostReply.findUnique({ where: { id: replyId } });
  if (!existing) return res.status(404).json({ message: 'Reply not found' });
  if (existing.authorId !== req.user.id) {
    return res.status(403).json({ message: 'Only the author can delete this reply' });
  }
  await prisma.coursePostReply.delete({ where: { id: replyId } });
  res.json({ success: true });
}));

export default router;
