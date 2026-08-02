/**
 * Add a student to a course study group (teacher-only).
 */
import { prisma } from '../../db/prisma.js';
import { memberInclude } from './groups.member-include.js';

export { memberInclude };

/** POST /:groupId/members */
export async function addGroupMember(req, res) {
  const { groupId } = req.params;
  const { studentId, role, transfer } = req.body;
  const gid = parseInt(groupId, 10);
  const sid = parseInt(studentId, 10);
  const shouldTransfer = transfer === true;

  if (!Number.isInteger(gid) || !Number.isFinite(sid)) {
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
    where: { studentId: sid, batchSectionId: group.courseOffering.sectionId },
  });
  if (!enrolled) {
    return res
      .status(400)
      .json({ message: 'Student is not enrolled in this course.' });
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
          where: {
            memberId_courseOfferingId: {
              memberId: sid,
              courseOfferingId: group.courseOfferingId,
            },
          },
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

  return res.json(member);
}

export {
  removeGroupMember,
  updateGroupMemberRole,
} from './groups.member-ops.js';
