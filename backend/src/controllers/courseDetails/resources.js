import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

router.get('/:courseId', auth, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  const resources = await prisma.resource.findMany({
    where: { courseId: parseInt(courseId) },
    include: {
      teacher: { select: { id: true, full_name: true } }
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(resources);
}));

router.post('/:courseId', auth, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, type, url, description } = req.body;
  const teacherId = req.user.id;

  const resource = await prisma.resource.create({
    data: {
      title,
      type,
      url,
      description,
      courseId: parseInt(courseId),
      teacherId,
    },
    include: {
      teacher: { select: { id: true, full_name: true } }
    },
  });

  res.json(resource);
}));

router.patch('/:resourceId', auth, asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { title, type, url, description } = req.body;

  const resource = await prisma.resource.update({
    where: { id: parseInt(resourceId) },
    data: {
      ...(title && { title }),
      ...(type && { type }),
      ...(url && { url }),
      ...(description !== undefined && { description }),
    },
    include: {
      teacher: { select: { id: true, full_name: true } }
    },
  });

  res.json(resource);
}));

router.delete('/:resourceId', auth, asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  await prisma.resource.delete({ where: { id: parseInt(resourceId) } });

  res.json({ success: true });
}));

export default router;