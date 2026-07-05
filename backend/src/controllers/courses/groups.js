import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
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
router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const offering = req.courseOffering;

  const groups = await prisma.courseGroup.findMany({
    where: { courseOfferingId: offering.id },
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
// group for this course offering the request is rejected with 409 unless
// transfer=true (moves the student to this group).
router.post('/:groupId/members', requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { studentId, role, transfer } = req.body;
  const gid = parseInt(groupId);
  const sid = parseInt(studentId, 10);
  const shouldTransfer = transfer === true;

  if (!Number.isFinite(sid)) {
    return res.status(400).json({ message: 'Valid studentId is required' });
  }

  const group = await prisma.courseGroup.findUnique({
    where: { id: gid },
    select: {
      courseOfferingId: true,
      courseOffering: { select: { sectionId: true } },
    },
  });
  if (!group) return res.status(404).json({ message: 'Group not found' });

  const enrolled = await prisma.studentRegistration.findFirst({
    where: {
      studentId: sid,
      batchSectionId: group.courseOffering.sectionId,
    },
  });
  if (!enrolled) {
    return res.status(400).json({ message: 'Student is not enrolled in this course.' });
  }

  const assignRole = role === 'LEADER' ? 'LEADER' : 'MEMBER';

  let member;
  try {
    member = await prisma.$transaction(async (tx) => {
      const inThisGroup = await tx.groupMember.findUnique({
        where: { groupId_memberId: { groupId: gid, memberId: sid } },
      });
      if (inThisGroup) {
        const err = new Error('Student is already in this group.');
        err.statusCode = 409;
        throw err;
      }

      const existing = await tx.groupMember.findUnique({
        where: {
          memberId_courseOfferingId: {
            memberId: sid,
            courseOfferingId: group.courseOfferingId,
          },
        },
        include: { group: { select: { name: true } } },
      });

      if (existing) {
        if (!shouldTransfer) {
          const err = new Error(
            `Student is already in "${existing.group.name}". Remove them first or move them here.`
          );
          err.statusCode = 409;
          throw err;
        }
        await tx.groupMember.delete({
          where: { memberId_courseOfferingId: { memberId: sid, courseOfferingId: group.courseOfferingId } },
        });
      }

      if (assignRole === 'LEADER') {
        await tx.groupMember.updateMany({
          where: { groupId: gid, role: 'LEADER' },
          data: { role: 'MEMBER' },
        });
      }

      return tx.groupMember.create({
        data: {
          groupId: gid,
          memberId: sid,
          courseOfferingId: group.courseOfferingId,
          role: assignRole,
        },
        include: memberInclude,
      });
    });
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.status(409).json({
        message: 'Student is already assigned to a group in this course.',
      });
    }
    if (err?.statusCode === 409) {
      return res.status(409).json({ message: err.message });
    }
    throw err;
  }

  res.json(member);
}));

// ── Remove a student from a group (teacher-only) ─────────────────────
router.delete('/:groupId/members/:memberId', requireStudyGroupManage(), asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;

  await prisma.groupMember.deleteMany({
    where: { groupId: parseInt(groupId), memberId: parseInt(memberId) },
  });

  res.json({ success: true });
}));

// ── Set / change a member's role (LEADER ↔ MEMBER) ──────────────────
// Only one LEADER per group — promoting a new leader auto-demotes the old one.
router.patch('/:groupId/members/:memberId/role', requireStudyGroupManage(), asyncHandler(async (req, res) => {
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
