import fs from 'fs';
import { prisma } from '../../../db/prisma.js';
import { getIo } from '../../../socket/hub.js';
import { courseOfferingRoomName } from '../../../utils/courseOfferingAccess.js';
import { commitUploadedFile, deleteStoredObject } from '../../../storage/objectStorage.js';
import { enforceUploadContentSafety } from '../resources.js';
import { messageInclude } from './helpers.js';

export async function uploadAttachments(req, res) {
  const messageId = parseInt(req.params.messageId, 10);
  const files = req.files ?? [];
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { room: { select: { courseOffering: { select: { publicId: true } } } } },
  });
  if (!message) {
    for (const f of files) try { fs.unlinkSync(f.path); } catch {}
    return res.status(404).json({ message: 'Message not found' });
  }
  if (message.senderId !== req.user.id) {
    for (const f of files) try { fs.unlinkSync(f.path); } catch {}
    return res.status(403).json({ message: 'Only the sender can attach files' });
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
          prefix: 'chat',
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
      console.error('chat attachment storage commit failed', err);
      return res.status(500).json({ message: 'Failed to store attachment' });
    }
  }

  const created = await prisma.$transaction(
    files.map((f, i) =>
      prisma.chatAttachment.create({
        data: {
          messageId,
          name: f.originalname,
          url: committed[i].url,
          size: f.size,
          mimeType: f.mimetype,
        },
      })
    )
  );

  const updated = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });
  const io = getIo();
  const roomName = courseOfferingRoomName(message.room.courseOffering);
  if (io && roomName) io.to(roomName).emit('message_updated', updated);

  res.status(201).json({ count: created.length, attachments: created });
}
