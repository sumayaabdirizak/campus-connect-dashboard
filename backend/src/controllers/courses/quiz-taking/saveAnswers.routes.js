import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { saveAttemptAnswers } from '../../../services/quizAttempt.service.js';
import { emitAnswerSaved as emitMonitorAnswerSaved } from '../../../socket/quizLiveMonitor.js';
import { requireQuizAttemptAccess } from '../../../middleware/courseOfferingRbac.js';
import { saveAttemptAnswersBodySchema } from '../../../validation/quizSchemas.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.put(
    '/attempts/:attemptId/answers', requireQuizAttemptAccess(),
    validateBody(saveAttemptAnswersBodySchema),
    asyncHandler(async (req, res) => {
      const attemptId = parseInt(req.params.attemptId, 10);
      const studentId = req.user.id ?? req.user.sub;
      if (req.user.role !== 'STUDENT' || Number(req.quizAttempt?.studentId) !== Number(studentId)) {
        return res.status(403).json({ message: 'Only the owning student can save answers' });
      }
      try {
        const result = await saveAttemptAnswers({
          attemptId,
          studentId,
          answers: req.body.answers,
        });
        res.json({ ...result, savedAt: new Date() });

        try {
          const quizId = req.quizAttempt?.quizId;
          if (quizId) {
            const answeredCount = await prisma.quizAnswer.count({
              where: {
                attemptId,
                OR: [
                  { selected_option_id: { not: null } },
                  { text_answer: { not: null, notIn: [""] } },
                ],
              },
            });
            const lastAnswer = Array.isArray(req.body.answers) && req.body.answers.length > 0
              ? req.body.answers[req.body.answers.length - 1]
              : null;
            emitMonitorAnswerSaved({
              quizId,
              attemptId,
              studentId,
              answeredCount,
              currentQuestionId: lastAnswer?.questionId ?? null,
            });
          }
        } catch (e) {
          console.warn("[quiz-monitor] emit on answer save failed:", e.message);
        }
      } catch (err) {
        const status = err.statusCode ?? 500;
        res.status(status).json({ message: err.message ?? 'Failed to save answers' });
      }
    })
  );
}
