import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireQuizAttemptAccess } from '../../../middleware/courseOfferingRbac.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get('/attempts/:attemptId', requireQuizAttemptAccess(), asyncHandler(async (req, res) => {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: parseInt(req.params.attemptId, 10) },
      include: {
        quiz: {
          include: {
            questions: {
              include: { options: true },
              orderBy: { order_index: 'asc' }
            }
          }
        },
        student: { select: { id: true, full_name: true, number: true } },
        answers: true
      },
    });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (req.user?.role === 'STUDENT' && !attempt.submitted_at) {
      return res.status(403).json({ message: 'Attempt not yet submitted' });
    }
    res.json(attempt);
  }));
}
