/**
 * Remove / role-change for course group members.
 */
import { prisma } from '../../db/prisma.js';
import { memberInclude } from './groups.member-include.js';

/** DELETE /:groupId/members/:memberId */
export async function removeGroupMember(req, res) {
  const gid = parseInt(req.params.groupId, 10);
  const mid = parseInt(req.params.memberId, 10);
  if (!Number.isInteger(gid) || !Number.isInteger(mid)) {
    return res.status(400).json({ message: 'Invalid group or member id' });
  }

  const result = await prisma.groupMember.deleteMany({
    where: { groupId: gid, memberId: mid },
  });
  if (result.count === 0) {
    return res.status(404).json({ message: 'Member not found in this group' });
  }
  return res.json({ success: true });
}

/** PATCH /:groupId/members/:memberId/role */
export async function updateGroupMemberRole(req, res) {
  const gid = parseInt(req.params.groupId, 10);
  const mid = parseInt(req.params.memberId, 10);
  const { role } = req.body;

  if (!Number.isInteger(gid) || !Number.isInteger(mid)) {
    return res.status(400).json({ message: 'Invalid group or member id' });
  }
  if (!['LEADER', 'MEMBER'].includes(role)) {
    return res.status(400).json({ message: 'Role must be LEADER or MEMBER' });
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_memberId: { groupId: gid, memberId: mid } },
    select: { id: true },
  });
  if (!existing) {
    return res.status(404).json({ message: 'Member not found in this group' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (role === 'LEADER') {
      await tx.groupMember.updateMany({
        where: { groupId: gid, role: 'LEADER' },
        data: { role: 'MEMBER' },
      });
    }
    return tx.groupMember.update({
      where: { groupId_memberId: { groupId: gid, memberId: mid } },
      data: { role },
      include: memberInclude,
    });
  });

  return res.json(updated);
}
