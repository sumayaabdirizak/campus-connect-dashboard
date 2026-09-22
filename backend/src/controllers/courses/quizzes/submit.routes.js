import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { finalizeAttempt } from '../../../services/quizAttempt.service.js';
import { emitSubmitted as emitMonitorSubmitted } from '../../../socket/quizLiveMonitor.js';
import { requireStudentQuizAccess } from '../../../middleware/courseOfferingRbac.js';
import { submitAttemptBodySchema } from '../../../validation/quizSchemas.js';
import { shapeStudentAttemptReview } from '../quiz-taking/shared.js';
import { notifyQuizSubmitted } from './notifyStudents.js';

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

      // finalizeAttempt itself has no deadline check — it's also the cron's
      // auto-submit path, which must be allowed to close an attempt after
      // expiry. What must NOT happen is a late manual call smuggling in
      // answers composed after time ran out. Past the deadline, finalize
      // with only what was already autosaved rather than the request body,
      // and stamp the same closure_reason the cron would have used.
      const isExpired = !!attemptRow.expires_at && new Date(attemptRow.expires_at) <= new Date();
      const updatedAttempt = await finalizeAttempt({
        attemptId,
        answers: isExpired ? [] : answers,
        violationsCount: violations_count,
        closureReason: isExpired ? 'time_expired' : undefined,
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

      // Manual (non-expired) submissions only — an auto-submit from the cron
      // sweeping expired attempts isn't a "just now" event worth alerting on.
      if (!isExpired) {
        const quizForNotify = await prisma.quiz.findUnique({
          where: { id: qid },
          select: {
            title: true,
            courseOfferingId: true,
            courseOffering: { select: { publicId: true } },
          },
        });
        if (quizForNotify?.courseOffering) {
          const student = await prisma.user.findUnique({
            where: { id: Number(studentId) },
            select: { full_name: true },
          });
          notifyQuizSubmitted(
            { id: qid, title: quizForNotify.title, courseOfferingId: quizForNotify.courseOfferingId },
            quizForNotify.courseOffering.publicId,
            { studentName: student?.full_name },
          );
        }
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
