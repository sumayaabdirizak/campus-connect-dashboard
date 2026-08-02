import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireStudentSubmission } from '../../../middleware/courseOfferingRbac.js';
import { loadMySubmissionContext } from './mySubmissionHelpers.js';
import { toSubmissionClient } from '../../../features/assignments/submissionDto.js';

const router = Router();

router.get(
  '/:assignmentId/my-submission',
  requireStudentSubmission(),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const studentId = req.user.id ?? req.user.sub;
    const { submission, effectiveExt, groupInfo } = await loadMySubmissionContext(
      assignmentId,
      studentId,
    );
    if (!submission) {
      return res.json({ _noSubmission: true, _extension: effectiveExt, _groupInfo: groupInfo });
    }
    res.json({
      ...toSubmissionClient(submission),
      _extension: effectiveExt,
      _groupInfo: groupInfo,
    });
  }),
);

export default router;
