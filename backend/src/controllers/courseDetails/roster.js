import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

router.get('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;

  const offering = await prisma.courseOffering.findUnique({
    where: { id: parseInt(courseOfferingId) },
    include: {
      registrations: {
        include: {
          student: { select: { id: true, full_name: true, email: true, number: true } }
        },
        orderBy: { student: { full_name: 'asc' } }
      }
    }
  });

  res.json(offering?.registrations || []);
}));

router.delete('/:courseOfferingId/students/:studentId', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId, studentId } = req.params;

  await prisma.studentRegistration.deleteMany({
    where: {
      courseOfferingId: parseInt(courseOfferingId),
      studentId: parseInt(studentId)
    }
  });

  res.json({ success: true });
}));

export default router;