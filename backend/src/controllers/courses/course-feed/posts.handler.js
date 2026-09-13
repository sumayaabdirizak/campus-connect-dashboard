import { prisma } from '../../../db/prisma.js';
import { isSafeExternalUrl } from '../../../utils/safeUrl.js';
import { postInclude } from './helpers.js';
import { notifyFeedPostCreated } from './notifyFeed.js';

export async function listPosts(req, res) {
  const courseOfferingId = req.courseOffering.id;

  const posts = await prisma.coursePost.findMany({
    where: { courseOfferingId },
    include: postInclude,
    orderBy: [{ isPinned: 'desc' }, { created_at: 'desc' }],
  });

  res.json(posts);
}

export async function createPost(req, res) {
  const courseOfferingId = req.courseOffering.id;
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
              .filter((a) => a && a.url && a.name && isSafeExternalUrl(a.url))
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

  notifyFeedPostCreated(post, req.courseOffering.publicId);
  res.status(201).json(post);
}

export async function editPost(req, res) {
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
}

export async function deletePost(req, res) {
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
}
