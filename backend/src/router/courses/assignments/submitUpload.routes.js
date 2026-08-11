import { Router } from 'express';
import fs from 'fs';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireStudentSubmission } from '../../../middleware/courseOfferingRbac.js';
import { uploadRateLimit } from '../../../middleware/perUserRateLimit.js';
import { commitUploadedFile } from '../../../storage/objectStorage.js';
import { submissionUpload } from '../../../controllers/courses/assignments/uploadConfig.js';

const router = Router();

router.post(
  '/:assignmentId/submissions/upload', uploadRateLimit, requireStudentSubmission(),
  submissionUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const hostBase = `${req.protocol}://${req.get('host')}`;
    let committed;
    try {
      committed = await commitUploadedFile({
        prefix: 'submissions',
        filename: req.file.filename,
        localPath: req.file.path,
        contentType: req.file.mimetype,
        hostBase,
      });
    } catch (err) {
      try { fs.unlinkSync(req.file.path); } catch {
        // ignore cleanup error
      }
      console.error('submission upload storage commit failed', err);
      return res.status(500).json({ message: 'Failed to store file' });
    }
    res.status(201).json({
      url: committed.url,
      storageKey: committed.storageKey,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  })
);

export default router;
