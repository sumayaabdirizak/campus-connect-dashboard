import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import { canManageOfferingContent } from '../../../utils/courseOfferingAccess.js';
import { stripQuizAnswerKeys } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
    const cid = req.courseOffering.id;
    const canManage = await canManageOfferingContent(req.user, req.courseOffering);

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseOfferingId: cid,
        ...(canManage ? {} : { is_draft: false }),
      },
      include: {
        questions: {
          include: { options: { orderBy: { order_index: 'asc' } } },
          orderBy: { order_index: 'asc' },
        },
        module: { select: { id: true, title: true, position: true, publishedAt: true } },
        paperFile: true,
        _count: {
          select: {
            attempts: { where: { submitted_at: { not: null } } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!canManage) {
      return res.json(quizzes.map((q) => stripQuizAnswerKeys(q)));
    }

    const quizIds = quizzes.map((q) => q.id);
    const pendingGroups = quizIds.length
      ? await prisma.quizAttempt.findMany({
          where: {
            quizId: { in: quizIds },
            submitted_at: { not: null },
            answers: {
              some: {
                is_correct: null,
                question: { question_type: 'SHORT_ANSWER' },
              },
            },
          },
          select: { quizId: true },
        })
      : [];
    const pendingByQuiz = new Map();
    for (const a of pendingGroups) {
      pendingByQuiz.set(a.quizId, (pendingByQuiz.get(a.quizId) ?? 0) + 1);
    }

    res.json(
      quizzes.map((q) => ({
        ...q,
        pendingGradingCount: pendingByQuiz.get(q.id) ?? 0,
      }))
    );
  }));
}
