/**
 * POST /group-dms/direct — get-or-create 1:1 DM (dean/teacher/student/office, scoped).
 */

import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getIo } from '../../../socket/hub.js';
import { getDiscussionCallerUserId } from '../../../services/discussions/discussionCaller.js';
import { assertCanDirectMessage } from '../../../services/discussions/assertCanDirectMessage.js';
import { toGroupDmDto } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/group-dms/direct', async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));

      const targetUserId = Number(req.body?.targetUserId);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json(apiErrorBody('targetUserId is required', null));
      }

      const gate = await assertCanDirectMessage(userId, targetUserId);
      if (!gate.ok) {
        return res.status(gate.status).json(apiErrorBody(gate.message, { code: gate.code }));
      }

      const includeShape = {
        members: {
          where: { leftAt: null },
          include: { user: { select: { id: true, full_name: true, email: true, avatarUrl: true } } },
        },
      };

      const mine = await prisma.groupDm.findMany({
        where: { archivedAt: null, members: { some: { userId, leftAt: null } } },
        include: { members: { where: { leftAt: null }, select: { userId: true } } },
      });
      const existingId = mine.find((g) => {
        const ids = g.members.map((m) => Number(m.userId));
        return ids.length === 2 && ids.includes(userId) && ids.includes(targetUserId);
      })?.id;

      if (existingId != null) {
        const existing = await prisma.groupDm.findUnique({
          where: { id: existingId },
          include: includeShape,
        });
        return res.status(200).json({ groupDm: toGroupDmDto(existing), created: false });
      }

      const created = await prisma.$transaction(async (tx) => {
        const gd = await tx.groupDm.create({ data: { name: null, createdById: userId } });
        await tx.groupDmMember.createMany({
          data: [
            { groupDmId: gd.id, userId, role: 'OWNER', canPost: true },
            { groupDmId: gd.id, userId: targetUserId, role: 'MEMBER', canPost: true },
          ],
        });
        return tx.groupDm.findUnique({ where: { id: gd.id }, include: includeShape });
      });

      const createdDto = toGroupDmDto(created);

      try {
        const io = getIo();
        if (io && created) {
          for (const uid of [userId, targetUserId]) {
            io.to(`user:${uid}`).emit('groupdm:new', { groupDm: createdDto });
          }
        }
      } catch (e) {
        console.warn('groupdm:new (direct) socket emit failed', e?.message);
      }

      return res.status(201).json({ groupDm: createdDto, created: true });
    } catch (error) {
      console.error('POST /discussions/group-dms/direct failed', error);
      return res.status(500).json(apiErrorBody('Failed to open direct message', null));
    }
  });
}
