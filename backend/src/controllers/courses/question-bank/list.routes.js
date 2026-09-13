import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { QUESTION_INCLUDE } from './shared.js';

/**
 * Teacher-only, like every other question-bank route (create/patch/delete/
 * bulkImport/importToQuiz/generate). This one used requireCourseOfferingRead
 * — which also grants enrolled STUDENTS — and QUESTION_INCLUDE's bare
 * bankOptions relation returns is_correct on every option with no
 * stripping. Together that let any student in the section fetch the whole
 * bank's answer key directly. There's no student-facing consumer of this
 * endpoint anywhere in the frontend; the bank is a teacher authoring tool.
 */
export function register(router) {
  router.get(
    '/:courseOfferingId', requireCourseOfferingManage(),
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
