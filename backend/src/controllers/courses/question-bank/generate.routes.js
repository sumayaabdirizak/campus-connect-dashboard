import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { generateQuestionsBodySchema } from '../../../validation/questionBankSchemas.js';
import {
  generateQuizQuestions,
  isAiEnabled,
} from '../../../services/aiQuestionGenerator.service.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:courseOfferingId/generate', requireCourseOfferingManage(),
    validateBody(generateQuestionsBodySchema),
    asyncHandler(async (req, res) => {
      if (!isAiEnabled()) {
        return res.status(503).json({
          message:
            'AI generation is disabled — no AI provider key is configured on the server. Set GROQ_API_KEY (recommended) or GEMINI_API_KEY in the backend .env.',
        });
      }

      const { prompt, sourceMaterial, count, questionTypes, difficulty } =
        req.body;

      let courseTitle = null;
      try {
        const offering = await prisma.courseOffering.findUnique({
          where: { id: req.courseOffering.id },
          select: { course: { select: { name: true, code: true } } },
        });
        if (offering?.course) {
          courseTitle = offering.course.code
            ? `${offering.course.code} — ${offering.course.name}`
            : offering.course.name;
        }
      } catch {
        // Course context is optional for generation.
      }

      try {
        const result = await generateQuizQuestions({
          prompt,
          sourceMaterial: sourceMaterial || null,
          count,
          questionTypes,
          difficulty,
          courseTitle,
        });

        res.json({
          questions: result.questions,
          usage: result.usage,
        });
      } catch (e) {
        const status = e.status || 500;
        res.status(status).json({
          message: e.message || 'AI generation failed',
        });
      }
    })
  );
}
