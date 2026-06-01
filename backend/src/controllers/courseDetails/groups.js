import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireStudyGroupManage,
} from "../../middleware/courseOfferingRbac.js";

const router = Router();

const memberInclude = {
  member: { select: { id: true, full_name: true, number: true } },
};

// ── List all groups in a course offering ─────────────────────────────
router.get('/:courseOfferingId', auth, requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;

  const groups = await prisma.courseGroup.findMany({
    where: { courseOfferingId: parseInt(courseOfferingId) },
    include: {
      members: {
        include: memberInclude,
        orderBy: [{ role: 'asc' }, { joined_at: 'asc' }], // LEADER first
      },
      _count: { select: { members: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json(groups);
}));

// ── Create a new group ───────────────────────────────────────────────
router.post('/:courseOfferingId', auth, requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { name } = req.body;

  const group = await prisma.courseGroup.create({
    data: {
      name,
      courseOfferingId: parseInt(courseOfferingId),
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
router.patch('/:groupId', auth, requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

  const group = await prisma.courseGroup.update({
    where: { id: parseInt(groupId) },
    data: { name: name.trim() },
    include: {
      members: { include: memberInclude },
      _count: { select: { members: true } },
    },
  });

  res.json(group);
}));

// ── Delete a group ───────────────────────────────────────────────────
router.delete('/:groupId', auth, requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const gid = parseInt(groupId);

  // Null-out groupId on submissions so they don't become dangling FKs.
  await prisma.$transaction([
    prisma.submissionExtension.updateMany({ where: { groupId: gid }, data: { groupId: null } }),
    prisma.submission.updateMany({ where: { groupId: gid }, data: { groupId: null } }),
    prisma.groupMember.deleteMany({ where: { groupId: gid } }),
    prisma.courseGroup.delete({ where: { id: gid } }),
  ]);

  res.json({ success: true });
}));

// ── Add a student to a group (teacher-only) ──────────────────────────
// Enforces one-group-per-course: if the student is already in another
// group for this course offering the request is rejected with 409.
router.post('/:groupId/members', auth, requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { studentId, role } = req.body;
  const gid = parseInt(groupId);
  const sid = parseInt(studentId);

  const group = await prisma.courseGroup.findUnique({
    where: { id: gid },
    select: { courseOfferingId: true },
  });
  if (!group) return res.status(404).json({ message: 'Group not found' });

  // One-group-per-course check
  const existing = await prisma.groupMember.findFirst({
    where: {
      memberId: sid,
      group: { courseOfferingId: group.courseOfferingId },
    },
    include: { group: { select: { name: true } } },
  });
  if (existing) {
    return res.status(409).json({
      message: `Student is already in "${existing.group.name}". Remove them first.`,
    });
  }

  // If assigning as LEADER, demote any existing leader in this group.
  const assignRole = role === 'LEADER' ? 'LEADER' : 'MEMBER';
  if (assignRole === 'LEADER') {
    await prisma.groupMember.updateMany({
      where: { groupId: gid, role: 'LEADER' },
      data: { role: 'MEMBER' },
    });
  }

  const member = await prisma.groupMember.create({
    data: { groupId: gid, memberId: sid, role: assignRole },
    include: memberInclude,
  });

  res.json(member);
}));

// ── Remove a student from a group (teacher-only) ─────────────────────
router.delete('/:groupId/members/:memberId', auth, requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;

  await prisma.groupMember.deleteMany({
    where: { groupId: parseInt(groupId), memberId: parseInt(memberId) },
  });

  res.json({ success: true });
}));

// ── Set / change a member's role (LEADER ↔ MEMBER) ──────────────────
// Only one LEADER per group — promoting a new leader auto-demotes the old one.
router.patch('/:groupId/members/:memberId/role', auth, requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const { role } = req.body;
  const gid = parseInt(groupId);
  const mid = parseInt(memberId);

  if (!['LEADER', 'MEMBER'].includes(role)) {
    return res.status(400).json({ message: 'Role must be LEADER or MEMBER' });
  }

  // Demote current leader first (only one leader per group).
  if (role === 'LEADER') {
    await prisma.groupMember.updateMany({
      where: { groupId: gid, role: 'LEADER' },
      data: { role: 'MEMBER' },
    });
  }

  const updated = await prisma.groupMember.update({
    where: { groupId_memberId: { groupId: gid, memberId: mid } },
    data: { role },
    include: memberInclude,
  });

  res.json(updated);
}));

export default router;
