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
import { nextCopyTitle } from '../../../utils/assertUniqueCourseTitle.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:quizId/duplicate', requireQuizManage(), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
  
    const source = await prisma.quiz.findUnique({
      where: { id: qid },
      include: {
        questions: {
          include: { options: { orderBy: { order_index: 'asc' } } },
          orderBy: { order_index: 'asc' },
        },
      },
    });
    if (!source) return res.status(404).json({ message: 'Quiz not found' });

    const copyTitle = await nextCopyTitle(
      prisma,
      'quiz',
      source.courseOfferingId,
      source.title
    );
  
    // Clone in one transaction so any DB error rolls back partial writes.
    const created = await prisma.$transaction(async (tx) => {
      const newQuiz = await tx.quiz.create({
        data: {
          title: copyTitle,
          description: source.description,
          duration_minutes: source.duration_minutes,
          courseOfferingId: source.courseOfferingId,
          is_draft: true, // always start drafts — protects against accidental publish
          open_at: source.open_at,
          close_at: source.close_at,
          shuffle_questions: source.shuffle_questions,
          shuffle_answers: source.shuffle_answers,
          max_attempts: source.max_attempts,
          passing_score: source.passing_score,
          timing_mode: source.timing_mode,
          scheduled_duration: source.scheduled_duration,
          confidence_scoring: source.confidence_scoring ?? false,
          moduleId: source.moduleId,
        },
      });
  
      for (const q of source.questions) {
        await tx.quizQuestion.create({
          data: {
            quizId: newQuiz.id,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            order_index: q.order_index,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            options: q.options.length
              ? {
                  create: q.options.map((o) => ({
                    option_text: o.option_text,
                    is_correct: o.is_correct,
                    order_index: o.order_index,
                  })),
                }
              : undefined,
          },
        });
      }
  
      return tx.quiz.findUnique({
        where: { id: newQuiz.id },
        include: {
          questions: { include: { options: true }, orderBy: { order_index: 'asc' } },
          module: { select: { id: true, title: true, position: true, publishedAt: true } },
          _count: { select: { attempts: true } },
        },
      });
    });
  
    res.status(201).json(created);
  }));
}
