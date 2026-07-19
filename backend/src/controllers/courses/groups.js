import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireStudyGroupManage,
} from '../../middleware/courseOfferingRbac.js';
import {
  memberInclude,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
} from './groups.members.js';

const router = Router();

// ── List all groups in a course offering ─────────────────────────────
router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const offering = req.courseOffering;
  const groups = await prisma.courseGroup.findMany({
    where: { courseOfferingId: offering.id },
    include: {
      members: {
        include: memberInclude,
        orderBy: [{ role: 'asc' }, { joined_at: 'asc' }],
      },
      _count: { select: { members: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(groups);
}));

// ── Create a new group ───────────────────────────────────────────────
router.post('/:courseOfferingId', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { name } = req.body;
  const trimmed = name?.trim();
  if (!trimmed) return res.status(400).json({ message: 'Name is required' });
  if (trimmed.length > 120) {
    return res.status(400).json({ message: 'Keep the name under 120 characters' });
  }
  const group = await prisma.courseGroup.create({
    data: {
      name: trimmed,
      courseOfferingId: req.courseOffering.id,
      created_by_id: req.user.id ?? req.user.sub,
    },
    include: {
      members: { include: memberInclude },
      _count: { select: { members: true } },
    },
  });
  res.json(group);
}));

// ── Rename a group ───────────────────────────────────────────────────
router.patch('/:groupId', requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { name } = req.body;
  const trimmed = name?.trim();
  if (!trimmed) return res.status(400).json({ message: 'Name is required' });
  if (trimmed.length > 120) {
    return res.status(400).json({ message: 'Keep the name under 120 characters' });
  }
  const group = await prisma.courseGroup.update({
    where: { id: parseInt(groupId) },
    data: { name: trimmed },
    include: {
      members: { include: memberInclude },
      _count: { select: { members: true } },
    },
  });
  res.json(group);
}));

// ── Delete a group ───────────────────────────────────────────────────
router.delete('/:groupId', requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const gid = parseInt(groupId);
  await prisma.$transaction([
    prisma.submissionExtension.updateMany({ where: { groupId: gid }, data: { groupId: null } }),
    prisma.submission.updateMany({ where: { groupId: gid }, data: { groupId: null } }),
    prisma.groupMember.deleteMany({ where: { groupId: gid } }),
    prisma.courseGroup.delete({ where: { id: gid } }),
  ]);
  res.json({ success: true });
}));

// ── Member management (extracted to groups.members.js) ───────────────
router.post('/:groupId/members', requireStudyGroupManage(), asyncHandler(addGroupMember));
router.delete('/:groupId/members/:memberId', requireStudyGroupManage(), asyncHandler(removeGroupMember));
router.patch('/:groupId/members/:memberId/role', requireStudyGroupManage(), asyncHandler(updateGroupMemberRole));

export default router;
