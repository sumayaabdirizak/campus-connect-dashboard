import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { aiGenerateRateLimit } from '../../../middleware/perUserRateLimit.js';
import { generateQuestionsBodySchema } from '../../../validation/questionBankSchemas.js';
import {
  generateQuizQuestions,
  isAiEnabled,
} from '../../../services/aiQuestionGenerator.service.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:courseOfferingId/generate',
    // Ahead of the RBAC check, same ordering as the other rate-limited
    // routes — a request that's going to be rejected anyway shouldn't cost
    // an extra DB round-trip first.
    aiGenerateRateLimit,
    requireCourseOfferingManage(),
    // Clamp before Joi — large PDF extracts can exceed the schema max and
    // would 400 before fitSourceForGroq can trim for Groq TPM.
    (req, _res, next) => {
      const raw = String(req.body?.sourceMaterial ?? '');
      const max = 30_000;
      if (raw.length > max) {
        req.body.sourceMaterial = raw.slice(0, max);
        console.log(
          `[generate] clamped source ${raw.length}->${max} before validate`
        );
      }
      next();
    },
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
      if (!String(sourceMaterial || '').trim()) {
        return res.status(400).json({
          message:
            'Source material is required — upload a file or pick a course resource before generating.',
        });
      }

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
          sourceTruncated: !!result.sourceTruncated,
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
