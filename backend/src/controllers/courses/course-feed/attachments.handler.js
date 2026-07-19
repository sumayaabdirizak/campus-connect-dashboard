import fs from 'fs';
import { prisma } from '../../../db/prisma.js';
import { enforceUploadContentSafety } from '../resources.js';
import { commitUploadedFile, deleteStoredObject, keyFromUploadUrl } from '../../../storage/objectStorage.js';

export async function uploadAttachments(req, res) {
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

  const verdict = await enforceUploadContentSafety(files);
  if (!verdict.ok) {
    return res.status(400).json({
      message: 'File contents do not match the declared type. Upload rejected.',
    });
  }

  const hostBase = `${req.protocol}://${req.get('host')}`;
  const committed = [];
  for (const f of files) {
    try {
      committed.push(
        await commitUploadedFile({
          prefix: 'course-feed',
          filename: f.filename,
          localPath: f.path,
          contentType: f.mimetype,
          hostBase,
        })
      );
    } catch (err) {
      for (const c of committed) {
        try { await deleteStoredObject(c.storageKey); } catch {}
      }
      for (const leftover of files) {
        try { fs.unlinkSync(leftover.path); } catch {}
      }
      console.error('course-feed attachment storage commit failed', err);
      return res.status(500).json({ message: 'Failed to store attachment' });
    }
  }

  const created = await prisma.$transaction(
    files.map((f, i) =>
      prisma.coursePostAttachment.create({
        data: {
          postId,
          name: f.originalname,
          url: committed[i].url,
          size: f.size,
          mimeType: f.mimetype,
        },
      })
    )
  );
  res.status(201).json({ count: created.length, attachments: created });
}

export async function deleteAttachment(req, res) {
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
    const key = keyFromUploadUrl(att.url, 'course-feed');
    if (key) await deleteStoredObject(key, 'course-feed');
  } catch {}
  res.json({ success: true });
}
