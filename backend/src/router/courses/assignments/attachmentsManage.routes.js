import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  requireAssignmentAttachmentRead,
  requireAssignmentManage,
} from '../../../middleware/courseOfferingRbac.js';
import {
  deleteStoredObject,
  sendStoredFile,
  keyFromUploadUrl,
} from '../../../storage/objectStorage.js';

const router = Router();

router.get(
  '/attachments/:attachmentId/download',
  requireAssignmentAttachmentRead(),
  asyncHandler(async (req, res) => {
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const att = await prisma.assignmentAttachment.findUnique({ where: { id: attachmentId } });
    if (!att) return res.status(404).json({ message: 'Not found' });
    const key = keyFromUploadUrl(att.url, 'assignments');
    if (!key) return res.status(404).json({ message: 'Not found' });
    return sendStoredFile(res, key, {
      legacyPrefix: 'assignments',
      downloadName: att.name,
      contentType: att.mimeType || undefined,
    });
  }),
);

router.delete(
  '/:assignmentId/attachments/:attachmentId',
  requireAssignmentManage(),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const att = await prisma.assignmentAttachment.findFirst({
      where: { id: attachmentId, assignmentId },
    });
    if (!att) return res.status(404).json({ message: 'Attachment not found' });

    await prisma.assignmentAttachment.delete({ where: { id: attachmentId } });
    try {
      const key = keyFromUploadUrl(att.url, 'assignments');
      if (key) await deleteStoredObject(key, 'assignments');
    } catch {
      // ignore cleanup error
    }
    res.json({ success: true });
  }),
);

export default router;
