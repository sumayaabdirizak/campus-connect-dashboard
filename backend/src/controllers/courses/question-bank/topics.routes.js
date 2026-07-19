import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get(
    '/:courseOfferingId/topics', requireCourseOfferingRead(),
    asyncHandler(async (req, res) => {
      const cid = req.courseOffering.id;
      const rows = await prisma.question.groupBy({
        by: ['topic'],
        where: {
          courseOfferingId: cid,
          is_active: true,
          topic: { not: null },
        },
        _count: { topic: true },
      });
      res.json(
        rows
          .filter((r) => r.topic)
          .map((r) => ({ name: r.topic, count: r._count.topic }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    })
  );
}
