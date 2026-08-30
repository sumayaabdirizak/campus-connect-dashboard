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
  assertQuizIsDraft,
  assertQuestionTypeAllowedForQuiz,
} from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:quizId/questions', requireQuizManage(), validateBody(createQuestionBodySchema), asyncHandler(async (req, res) => {
    assertQuizIsDraft(req.quiz);
    const qid = parseInt(req.params.quizId, 10);
    const { question_text, question_type, points, correct_answer, explanation, options } = req.body;

    assertQuestionTypeAllowedForQuiz(req.quiz, question_type);
    // `?? -1` not `|| 0`: the existing `|| 0` collapses a legitimate
    // `order_index === 0` to 0, so the second question would also get 1 and
    // collide. Treating "no previous question" as -1 gives a clean 0, 1, 2…
    const lastQuestion = await prisma.quizQuestion.findFirst({
      where: { quizId: qid },
      orderBy: { order_index: 'desc' }
    });
    const order_index = (lastQuestion?.order_index ?? -1) + 1;
  
    // Create question + its options in one nested create so the row is never
    // left partially populated if the request fails mid-way.
    const question = await prisma.quizQuestion.create({
      data: {
        quizId: qid,
        question_text,
        question_type: question_type || 'MCQ',
        points: points || 1,
        correct_answer,
        explanation: explanation ?? null,
        order_index,
        options: options && options.length > 0
          ? {
              create: options.map((opt, idx) => ({
                option_text: opt.option_text,
                is_correct: opt.is_correct || false,
                order_index: opt.order_index ?? idx,
              }))
            }
          : undefined,
      },
      include: { options: { orderBy: { order_index: 'asc' } } }
    });
  
    res.json(question);
  }));

  router.patch('/questions/:questionId', requireQuizQuestionManage(), validateBody(patchQuestionBodySchema), asyncHandler(async (req, res) => {
    assertQuizIsDraft(req.quiz);
    const qid = parseInt(req.params.questionId, 10);
    const { question_text, question_type, points, correct_answer, explanation, options } = req.body;

    if (question_type) {
      assertQuestionTypeAllowedForQuiz(req.quiz, question_type);
    }
    // Wrap the question update + option swap in a transaction so a concurrent
    // reader never sees "options deleted, new ones not yet created".
    const updated = await prisma.$transaction(async (tx) => {
      await tx.quizQuestion.update({
        where: { id: qid },
        data: {
          ...(question_text && { question_text }),
          ...(question_type && { question_type }),
          ...(points && { points }),
          ...(correct_answer !== undefined && { correct_answer }),
          ...(explanation !== undefined && { explanation }),
        },
      });
  
      if (options) {
        await tx.quizOption.deleteMany({ where: { questionId: qid } });
        if (options.length > 0) {
          await tx.quizOption.createMany({
            data: options.map((opt, idx) => ({
              questionId: qid,
              option_text: opt.option_text,
              is_correct: opt.is_correct || false,
              order_index: opt.order_index ?? idx,
            }))
          });
        }
      }
  
      return tx.quizQuestion.findUnique({
        where: { id: qid },
        include: { options: { orderBy: { order_index: 'asc' } } }
      });
    });
  
    res.json(updated);
  }));

  router.delete('/questions/:questionId', requireQuizQuestionManage(), asyncHandler(async (req, res) => {
    assertQuizIsDraft(req.quiz);
    const qid = parseInt(req.params.questionId, 10);
    await prisma.quizQuestion.delete({ where: { id: qid } });
    res.json({ success: true });
  }));
}
