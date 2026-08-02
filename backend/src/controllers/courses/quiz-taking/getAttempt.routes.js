import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireQuizAttemptAccess } from '../../../middleware/courseOfferingRbac.js';
import { canManageOfferingContent } from '../../../utils/courseOfferingAccess.js';
import { shapeStudentAttemptReview } from './shared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get('/attempts/:attemptId', requireQuizAttemptAccess(), asyncHandler(async (req, res) => {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: parseInt(req.params.attemptId, 10) },
      include: {
        quiz: {
          include: {
            questions: {
              include: { options: { orderBy: { order_index: 'asc' } } },
              orderBy: { order_index: 'asc' },
            },
            courseOffering: {
              include: {
                section: {
                  include: {
                    batch: { include: { program: { include: { department: true } } } },
                  },
                },
                course: { include: { department: true } },
              },
            },
          },
        },
        student: { select: { id: true, full_name: true, number: true } },
        answers: true,
      },
    });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (req.user?.role === 'STUDENT' && !attempt.submitted_at) {
      return res.status(403).json({ message: 'Attempt not yet submitted' });
    }

    const isManager = await canManageOfferingContent(req.user, attempt.quiz.courseOffering);
    const { courseOffering: _co, ...quizRest } = attempt.quiz ?? {};
    const base = { ...attempt, quiz: quizRest };

    if (isManager) {
      return res.json({ ...base, answers_revealed: true });
    }
    res.json(shapeStudentAttemptReview(base));
  }));
}
