import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { finalizeAttempt } from '../../../services/quizAttempt.service.js';
import { emitSubmitted as emitMonitorSubmitted } from '../../../socket/quizLiveMonitor.js';
import { requireStudentQuizAccess } from '../../../middleware/courseOfferingRbac.js';
import { submitAttemptBodySchema } from '../../../validation/quizSchemas.js';
import { shapeStudentAttemptReview } from '../quiz-taking/shared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:quizId/submit',
    requireStudentQuizAccess(),
    validateBody(submitAttemptBodySchema),
    asyncHandler(async (req, res) => {
      const qid = parseInt(req.params.quizId, 10);
      const { attemptId, answers, violations_count } = req.body;
      const studentId = req.user.id ?? req.user.sub;

      const attemptRow = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
      if (!attemptRow) return res.status(404).json({ message: 'Attempt not found' });
      if (Number(attemptRow.studentId) !== Number(studentId) || attemptRow.quizId !== qid) {
        return res.status(403).json({ message: 'Attempt does not belong to caller' });
      }

      const updatedAttempt = await finalizeAttempt({
        attemptId,
        answers,
        violationsCount: violations_count,
      });

      try {
        emitMonitorSubmitted({
          quizId: qid,
          attempt: updatedAttempt,
          closureReason: updatedAttempt?.closure_reason ?? null,
        });
      } catch (e) {
        console.warn('[quiz-monitor] emit on submit failed:', e.message);
      }

      // Idempotent re-submit may omit quiz tree — reload for review shaping.
      let forReview = updatedAttempt;
      if (!updatedAttempt?.quiz) {
        forReview = await prisma.quizAttempt.findUnique({
          where: { id: attemptId },
          include: {
            student: { select: { id: true, full_name: true } },
            answers: true,
            quiz: {
              include: {
                questions: {
                  include: { options: { orderBy: { order_index: 'asc' } } },
                  orderBy: { order_index: 'asc' },
                },
              },
            },
          },
        });
      }

      res.json(shapeStudentAttemptReview(forReview));
    })
  );
}
