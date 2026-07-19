import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import { QUESTION_INCLUDE } from './shared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get(
    '/:courseOfferingId', requireCourseOfferingRead(),
    asyncHandler(async (req, res) => {
      const cid = req.courseOffering.id;
      const { topic, difficulty, moduleId, search } = req.query;

      const where = {
        courseOfferingId: cid,
        is_active: true,
      };
      if (topic) where.topic = String(topic);
      if (difficulty) where.difficulty = String(difficulty);
      if (moduleId === 'none') {
        where.moduleId = null;
      } else if (moduleId) {
        where.moduleId = Number(moduleId);
      }
      if (search && String(search).trim()) {
        where.question_text = { contains: String(search).trim(), mode: 'insensitive' };
      }

      const questions = await prisma.question.findMany({
        where,
        include: QUESTION_INCLUDE,
        orderBy: { created_at: 'desc' },
      });
      res.json(questions);
    })
  );
}
