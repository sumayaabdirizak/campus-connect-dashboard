import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireSubmissionFileAccess } from '../../../middleware/courseOfferingRbac.js';
import {
  sendStoredFile,
  keyFromUploadUrl,
} from '../../../storage/objectStorage.js';

const router = Router();

/**
 * Course-scoped submission file (teacher, owner, or group member).
 * Prefer this over raw /uploads/submissions/... for IDOR-sensitive access.
 */
router.get(
  '/:assignmentId/submissions/:submissionId/file',
  requireSubmissionFileAccess(),
  asyncHandler(async (req, res) => {
    const url = req.submission?.content_url;
    if (!url || typeof url !== 'string') {
      return res.status(404).json({ message: 'No file attached' });
    }

    // External / non-stored links: redirect after RBAC (do not proxy arbitrary hosts).
    if (!/\/uploads\//i.test(url) && /^https?:\/\//i.test(url)) {
      return res.redirect(302, url);
    }

    const key = keyFromUploadUrl(url, 'submissions');
    if (!key) return res.status(404).json({ message: 'Not found' });

    const nameGuess = key.split('/').pop() || 'submission';
    return sendStoredFile(res, key, {
      legacyPrefix: 'submissions',
      downloadName: nameGuess,
      inline: /\.pdf$/i.test(nameGuess),
    });
  }),
);

export default router;
