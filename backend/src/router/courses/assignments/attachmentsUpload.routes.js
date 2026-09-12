import { Router } from 'express';
import fs from 'fs';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';
import { uploadRateLimit } from '../../../middleware/perUserRateLimit.js';
import { commitUploadedFile, deleteStoredObject } from '../../../storage/objectStorage.js';
import { assignmentUpload } from '../../../controllers/courses/assignments/uploadConfig.js';

const router = Router();

router.post(
  '/:assignmentId/attachments',
  uploadRateLimit,
  requireAssignmentManage(),
  (req, res, next) => {
    assignmentUpload.array('files', 10)(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const files = req.files ?? [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true },
    });
    if (!assignment) {
      for (const f of files) try { fs.unlinkSync(f.path); } catch {
        // ignore cleanup error
      }
      return res.status(404).json({ message: 'Assignment not found' });
    }
    const uploadedById = req.user.id ?? req.user.sub;
    const hostBase = `${req.protocol}://${req.get('host')}`;

    const committed = [];
    for (const f of files) {
      try {
        committed.push(
          await commitUploadedFile({
            prefix: 'assignments',
            filename: f.filename,
            localPath: f.path,
            contentType: f.mimetype,
            hostBase,
          }),
        );
      } catch (err) {
        for (const c of committed) {
          try { await deleteStoredObject(c.storageKey); } catch {
            // ignore cleanup error
          }
        }
        for (const leftover of files) {
          try { fs.unlinkSync(leftover.path); } catch {
            // ignore cleanup error
          }
        }
        console.error('assignment attachment storage commit failed', err);
        return res.status(500).json({ message: 'Failed to store attachment' });
      }
    }

    const created = await prisma.$transaction(
      files.map((f, i) =>
        prisma.assignmentAttachment.create({
          data: {
            assignmentId,
            name: f.originalname,
            url: committed[i].url,
            size: f.size,
            mimeType: f.mimetype,
            uploadedById,
          },
        }),
      ),
    );

    res.status(201).json({ count: created.length, attachments: created });
  }),
);

export default router;
