import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
} from "../../middleware/courseOfferingRbac.js";

const router = Router();

router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const offering = req.courseOffering;

  const section = await prisma.batchSection.findUnique({
    where: { id: offering.sectionId },
    include: {
      studentRegistrations: {
        include: {
          student: { select: { id: true, full_name: true, email: true, number: true } },
        },
        orderBy: { student: { full_name: 'asc' } },
      },
    },
  });

  res.json(section?.studentRegistrations || []);
}));

router.delete('/:courseOfferingId/students/:studentId', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const offering = req.courseOffering;

  await prisma.studentRegistration.deleteMany({
    where: {
      batchSectionId: offering.sectionId,
      studentId: parseInt(studentId, 10),
    },
  });

  res.json({ success: true });
}));

export default router;
