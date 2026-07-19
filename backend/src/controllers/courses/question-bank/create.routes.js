import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { createBankQuestionBodySchema } from '../../../validation/questionBankSchemas.js';
import { QUESTION_INCLUDE, resolveModuleIdForOffering } from './shared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:courseOfferingId', requireCourseOfferingManage(),
    validateBody(createBankQuestionBodySchema),
    asyncHandler(async (req, res) => {
      const cid = req.courseOffering.id;
      const teacherId = req.user.id ?? req.user.sub;
      const { question_text, question_type, points, topic, difficulty, options, moduleId } =
        req.body;

      let resolvedModuleId;
      try {
        resolvedModuleId = await resolveModuleIdForOffering(moduleId, cid);
      } catch (e) {
        return res.status(e.status || 400).json({ message: e.message });
      }

      const created = await prisma.question.create({
        data: {
          question_text,
          question_type: question_type || 'MCQ',
          points: points ?? 1,
          topic: topic || null,
          difficulty: difficulty || null,
          courseOfferingId: cid,
          moduleId: resolvedModuleId ?? null,
          created_by: teacherId,
          bankOptions: options?.length
            ? {
                create: options.map((opt, idx) => ({
                  option_text: opt.option_text,
                  is_correct: !!opt.is_correct,
                  order_index: opt.order_index ?? idx,
                })),
              }
            : undefined,
        },
        include: QUESTION_INCLUDE,
      });

      res.status(201).json(created);
    })
  );
}
