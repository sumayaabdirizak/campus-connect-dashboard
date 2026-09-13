import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { patchBankQuestionBodySchema } from '../../../validation/questionBankSchemas.js';
import { QUESTION_INCLUDE, resolveModuleIdForOffering } from './shared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.patch(
    '/:courseOfferingId/:questionId', requireCourseOfferingManage(),
    validateBody(patchBankQuestionBodySchema),
    asyncHandler(async (req, res) => {
      const cid = req.courseOffering.id;
      const qid = parseInt(req.params.questionId, 10);
      const {
        question_text,
        question_type,
        points,
        topic,
        difficulty,
        moduleId,
        is_active,
        options,
      } = req.body;

      const existing = await prisma.question.findUnique({
        where: { id: qid },
        select: { courseOfferingId: true },
      });
      if (!existing || existing.courseOfferingId !== cid) {
        return res.status(404).json({ message: 'Question not found in this course' });
      }

      let resolvedModuleId;
      if (moduleId !== undefined) {
        try {
          resolvedModuleId = await resolveModuleIdForOffering(moduleId, cid);
        } catch (e) {
          return res.status(e.status || 400).json({ message: e.message });
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.question.update({
          where: { id: qid },
          data: {
            ...(question_text && { question_text }),
            ...(question_type && { question_type }),
            ...(points !== undefined && { points }),
            ...(topic !== undefined && { topic: topic || null }),
            ...(difficulty !== undefined && { difficulty: difficulty || null }),
            ...(is_active !== undefined && { is_active }),
            ...(resolvedModuleId !== undefined && { moduleId: resolvedModuleId }),
          },
        });

        if (options) {
          await tx.questionOptionBank.deleteMany({ where: { questionId: qid } });
          if (options.length > 0) {
            await tx.questionOptionBank.createMany({
              data: options.map((opt, idx) => ({
                questionId: qid,
                option_text: opt.option_text,
                is_correct: !!opt.is_correct,
                order_index: opt.order_index ?? idx,
              })),
            });
          }
        }

        return tx.question.findUnique({
          where: { id: qid },
          include: QUESTION_INCLUDE,
        });
      });

      res.json(updated);
    })
  );
}
