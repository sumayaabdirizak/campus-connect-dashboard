import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { finalizeAttempt } from '../../../services/quizAttempt.service.js';
import {
  emitViolation as emitMonitorViolation,
  emitSubmitted as emitMonitorSubmitted,
} from '../../../socket/quizLiveMonitor.js';
import { requireQuizAttemptAccess } from '../../../middleware/courseOfferingRbac.js';
import { quizViolationRateLimit } from '../../../middleware/perUserRateLimit.js';
import { MAX_WARNINGS } from './shared.js';
import { loadLifetimeViolations } from './startAttempt.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/attempts/:attemptId/violation', quizViolationRateLimit, requireQuizAttemptAccess(), asyncHandler(async (req, res) => {
    const attemptId = parseInt(req.params.attemptId, 10);
    const studentId = req.user.id ?? req.user.sub;
    const kind = typeof req.body?.kind === 'string' ? req.body.kind.slice(0, 32) : 'unknown';

    if (req.user.role !== 'STUDENT' || Number(req.quizAttempt?.studentId) !== Number(studentId)) {
      return res.status(403).json({ message: 'Only the owning student can report violations' });
    }

    const current = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        quizId: true,
        submitted_at: true,
        violations_count: true,
        warnings_shown: true,
      },
    });
    if (!current) return res.status(404).json({ message: 'Attempt not found' });

    const { priorViolations } = await loadLifetimeViolations(current.quizId, studentId);

    if (current.submitted_at) {
      return res.json({
        violations_count: priorViolations + (current.violations_count || 0),
        warnings_shown: priorViolations + (current.warnings_shown || 0),
        auto_closed: true,
        max_warnings: MAX_WARNINGS,
      });
    }

    const nextOnAttempt = (current.violations_count ?? 0) + 1;
    const lifetime = priorViolations + nextOnAttempt;
    const shouldClose = lifetime >= MAX_WARNINGS;
    const quizIdForMonitor = req.quizAttempt?.quizId;

    if (shouldClose) {
      const finalized = await finalizeAttempt({
        attemptId,
        violationsCount: nextOnAttempt,
        closureReason: 'violations',
      });
      console.log(
        `[quiz] auto-closed attempt ${attemptId} for student ${studentId} after ${lifetime} lifetime violations (last: ${kind})`
      );

      if (quizIdForMonitor) {
        emitMonitorViolation({
          quizId: quizIdForMonitor,
          attemptId,
          studentId,
          violations_count: lifetime,
          kind,
          auto_closed: true,
        });
        if (finalized) {
          emitMonitorSubmitted({
            quizId: quizIdForMonitor,
            attempt: finalized,
            closureReason: 'violations',
          });
        }
      }

      return res.json({
        violations_count: lifetime,
        warnings_shown: MAX_WARNINGS,
        auto_closed: true,
        max_warnings: MAX_WARNINGS,
      });
    }

    const updated = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        violations_count: nextOnAttempt,
        warnings_shown: nextOnAttempt,
      },
      select: { violations_count: true, warnings_shown: true },
    });

    if (quizIdForMonitor) {
      emitMonitorViolation({
        quizId: quizIdForMonitor,
        attemptId,
        studentId,
        violations_count: lifetime,
        kind,
        auto_closed: false,
      });
    }

    res.json({
      violations_count: lifetime,
      warnings_shown: priorViolations + updated.warnings_shown,
      auto_closed: false,
      max_warnings: MAX_WARNINGS,
    });
  }));
}
