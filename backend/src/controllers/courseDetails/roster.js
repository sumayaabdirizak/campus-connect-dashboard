import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
} from "../../middleware/courseOfferingRbac.js";

const router = Router();

router.get('/:courseOfferingId', auth, requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;

  const offering = await prisma.courseOffering.findUnique({
    where: { id: parseInt(courseOfferingId) },
    include: {
      section: {
        include: {
          studentRegistrations: {
            include: {
              student: { select: { id: true, full_name: true, email: true, number: true } }
            },
            orderBy: { student: { full_name: 'asc' } }
          }
        }
      }
    }
  });

  res.json(offering?.section?.studentRegistrations || []);
}));

router.delete('/:courseOfferingId/students/:studentId', auth, requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { courseOfferingId, studentId } = req.params;

  // StudentRegistration belongs to a BatchSection (not directly to a
  // CourseOffering). Resolve the offering's sectionId first so the delete
  // targets the correct enrollment row.
  const offering = await prisma.courseOffering.findUnique({
    where: { id: parseInt(courseOfferingId) },
    select: { sectionId: true },
  });
  if (!offering) return res.status(404).json({ message: 'Course offering not found' });

  await prisma.studentRegistration.deleteMany({
    where: {
      batchSectionId: offering.sectionId,
      studentId: parseInt(studentId)
    }
  });

  res.json({ success: true });
}));

export default router;