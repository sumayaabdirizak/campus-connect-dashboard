import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { generateQuestionsBodySchema } from '../../../validation/questionBankSchemas.js';
import {
  generateQuizQuestions,
  isAiEnabled,
} from '../../../services/aiQuestionGenerator.service.js';

// #region agent log
function routeDbg(message, data) {
  const line = JSON.stringify({
    sessionId: 'c4b419',
    runId: 'ui-verify',
    hypothesisId: 'A',
    location: 'generate.routes.js',
    message,
    data,
    timestamp: Date.now(),
  });
  try {
    appendFileSync(path.resolve(process.cwd(), '../debug-c4b419.log'), `${line}\n`);
  } catch {
    /* ignore */
  }
  fetch('http://127.0.0.1:7804/ingest/31870779-47f0-4312-b278-1c6da891de23', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'c4b419',
    },
    body: line,
  }).catch(() => {});
}
// #endregion

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:courseOfferingId/generate',
    // #region agent log
    (req, _res, next) => {
      const sourceLen = String(req.body?.sourceMaterial || '').length;
      console.log(
        `[generate] pre-auth offering=${req.params.courseOfferingId} sourceLen=${sourceLen}`
      );
      routeDbg('generate pre-auth', {
        offeringId: req.params.courseOfferingId,
        sourceLen,
      });
      next();
    },
    // #endregion
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

        // #region agent log
        routeDbg('generate ok', {
          n: result.questions?.length ?? 0,
          truncated: !!result.sourceTruncated,
          usage: result.usage || null,
        });
        // #endregion

        res.json({
          questions: result.questions,
          usage: result.usage,
          sourceTruncated: !!result.sourceTruncated,
        });
      } catch (e) {
        // #region agent log
        routeDbg('generate fail', {
          status: e.status || 500,
          message: String(e.message || e).slice(0, 240),
        });
        // #endregion
        const status = e.status || 500;
        res.status(status).json({
          message: e.message || 'AI generation failed',
        });
      }
    })
  );
}
