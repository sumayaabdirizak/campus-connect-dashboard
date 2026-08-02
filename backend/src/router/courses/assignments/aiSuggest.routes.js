import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireSubmissionGrade } from '../../../middleware/courseOfferingRbac.js';
import { suggestGradeForSubmission } from '../../../services/aiGradingAssist.service.js';

const router = Router();

router.post(
  '/:assignmentId/submissions/:submissionId/ai-suggest', requireSubmissionGrade(),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const submissionId = parseInt(req.params.submissionId, 10);
    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, assignmentId },
      include: {
        assignment: { select: { title: true, description: true, lateWindowMinutes: true } },
        student: { select: { full_name: true } },
      },
    });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (!submission.content_url) {
      return res.status(400).json({ message: 'This submission has no content to grade' });
    }

    try {
      const suggestion = await suggestGradeForSubmission({
        assignment: submission.assignment,
        submission,
        student: submission.student,
      });
      res.json(suggestion);
    } catch (e) {
      // Surface the configuration error (missing API key) distinctly from
      // model failures so the frontend can show a useful toast.
      const message = e instanceof Error ? e.message : 'AI suggestion failed';
      const status = /not configured/i.test(message) ? 503 : 502;
      res.status(status).json({ message });
    }
  })
);

export default router;
