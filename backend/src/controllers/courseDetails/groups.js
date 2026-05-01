import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

router.get('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  
  const groups = await prisma.courseGroup.findMany({
    where: { courseOfferingId: parseInt(courseOfferingId) },
    include: {
      members: { select: { id: true, full_name: true, number: true } },
      _count: { select: { members: true } }
    },
    orderBy: { name: 'asc' },
  });

  res.json(groups);
}));

router.post('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { name, description } = req.body;

  const group = await prisma.courseGroup.create({
    data: {
      name,
      description,
      courseOfferingId: parseInt(courseOfferingId),
    },
    include: {
      members: true,
      _count: { select: { members: true } }
    },
  });

  res.json(group);
}));

router.delete('/:groupId', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  await prisma.groupMember.deleteMany({ where: { groupId: parseInt(groupId) } });
  await prisma.courseGroup.delete({ where: { id: parseInt(groupId) } });

  res.json({ success: true });
}));

router.post('/:groupId/members', auth, asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { studentId } = req.body;

  const member = await prisma.groupMember.create({
    data: {
      groupId: parseInt(groupId),
      studentId,
    },
    include: {
      student: { select: { id: true, full_name: true, number: true } }
    },
  });

  res.json(member);
}));

router.delete('/:groupId/members/:memberId', auth, asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;

  await prisma.groupMember.deleteMany({
    where: { groupId: parseInt(groupId), memberId: parseInt(memberId) },
  });

  res.json({ success: true });
}));

export default router;