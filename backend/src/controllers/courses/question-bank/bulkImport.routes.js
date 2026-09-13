import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { importBankQuestionsBodySchema } from '../../../validation/questionBankSchemas.js';
import { resolveModuleIdForOffering } from './shared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:courseOfferingId/import', requireCourseOfferingManage(),
    validateBody(importBankQuestionsBodySchema),
    asyncHandler(async (req, res) => {
      const cid = req.courseOffering.id;
      const teacherId = req.user.id ?? req.user.sub;
      const { questions } = req.body;

      const resolvedModuleIds = [];
      for (const q of questions) {
        try {
          resolvedModuleIds.push(await resolveModuleIdForOffering(q.moduleId, cid));
        } catch (e) {
          return res.status(e.status || 400).json({ message: e.message });
        }
      }

      const created = await prisma.$transaction(
        questions.map((q, i) =>
          prisma.question.create({
            data: {
              question_text: q.question_text,
              question_type: q.question_type || 'MCQ',
              points: q.points ?? 1,
              topic: q.topic || null,
              difficulty: q.difficulty || null,
              courseOfferingId: cid,
              moduleId: resolvedModuleIds[i] ?? null,
              created_by: teacherId,
              bankOptions: q.options?.length
                ? {
                    create: q.options.map((opt, idx) => ({
                      option_text: opt.option_text,
                      is_correct: !!opt.is_correct,
                      order_index: opt.order_index ?? idx,
                    })),
                  }
                : undefined,
            },
            select: { id: true },
          })
        )
      );

      res.json({ success: true, imported: created.length });
    })
  );
}
