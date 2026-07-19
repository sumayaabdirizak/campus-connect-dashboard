import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { finalizeAttempt } from '../../../services/quizAttempt.service.js';
import { emitSubmitted as emitMonitorSubmitted } from '../../../socket/quizLiveMonitor.js';
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireQuizManage,
  requireQuizQuestionManage,
  requireStudentQuizAccess,
} from '../../../middleware/courseOfferingRbac.js';
import {
  createQuizBodySchema,
  patchQuizBodySchema,
  createQuestionBodySchema,
  patchQuestionBodySchema,
  submitAttemptBodySchema,
  reorderQuestionsBodySchema,
  importQuizCsvBodySchema,
} from '../../../validation/quizSchemas.js';
import {
  resolveModuleIdForOffering,
  assertQuizIsDraft,
  csvEscape,
  buildQuizCsv,
} from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:quizId/submit', requireStudentQuizAccess(), validateBody(submitAttemptBodySchema), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    const { attemptId, answers, violations_count } = req.body;
    const studentId = req.user.id ?? req.user.sub;
  
    // Verify ownership before delegating to the shared finalizer. Without this
    // check a student could submit anyone else's attempt by guessing the id.
    const attemptRow = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attemptRow) return res.status(404).json({ message: 'Attempt not found' });
    if (Number(attemptRow.studentId) !== Number(studentId) || attemptRow.quizId !== qid) {
      return res.status(403).json({ message: 'Attempt does not belong to caller' });
    }
  
    // If the deadline already passed, the auto-submit cron may have finalized
    // this attempt seconds ago. `finalizeAttempt` is idempotent — it returns
    // the existing finalized row instead of double-scoring.
    const updatedAttempt = await finalizeAttempt({
      attemptId,
      answers,
      violationsCount: violations_count,
    });
  
    // Live-monitor: flip the teacher's tile to "submitted" with the score.
    // closure_reason is either null (manual submit) or whatever finalize put
    // on the row (e.g. 'time_expired' if cron beat the student to it).
    try {
      emitMonitorSubmitted({
        quizId: qid,
        attempt: updatedAttempt,
        closureReason: updatedAttempt?.closure_reason ?? null,
      });
    } catch (e) {
      console.warn("[quiz-monitor] emit on submit failed:", e.message);
    }
  
    res.json(updatedAttempt);
  }));
}
