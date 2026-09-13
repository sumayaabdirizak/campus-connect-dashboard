/**
 * Group DMs (3–10 members, no 1:1). Mounted at `/api/discussions`.
 */

import express from "express";
import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { getIo } from "../../../socket/hub.js";
import { buildUnreadSocketPayload } from "../../../services/discussions/buildUnreadPayload.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../../services/discussions/discussionPagination.js";
import { getDiscussionCallerUserId } from "../../../services/discussions/discussionCaller.js";
import {
  createGroupDmSchema,
  groupDmSendMessageSchema,
  addGroupDmMembersSchema,
} from "../../../validation/groupDiscussionSchemas.js";
import { loadDmUserRole } from "../../../services/discussions/groupDmEligibility.js";
import { assertAllUsersDmEligible } from "../../../services/discussions/assertAllUsersDmEligible.js";
import { assertUsersAreDeanGroupMembers } from "../../../services/discussions/assertDeanFacultyGroupMembers.js";

import { getActiveMember, MAX_TOTAL_MEMBERS, toGroupDmDto } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post("/group-dms/:groupDmId/members", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const parsed = addGroupDmMembersSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }

      const member = await getActiveMember(req.params.groupDmId, userId);
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
      const groupDmId = member.groupDm.id;

      const currentCount = await prisma.groupDmMember.count({
        where: { groupDmId, leftAt: null },
      });
      const newIds = parsed.data.userIds.filter((id) => id !== userId);
      if (currentCount + newIds.length > MAX_TOTAL_MEMBERS) {
        return res.status(400).json(apiErrorBody("Member limit exceeded", null));
      }

      const caller = await loadDmUserRole(userId);
      const roleGate =
        caller?.roleName === "DEAN"
          ? await assertUsersAreDeanGroupMembers(newIds, prisma)
          : await assertAllUsersDmEligible(newIds);
      if (!roleGate.ok) {
        return res.status(roleGate.status).json(apiErrorBody(roleGate.message, { code: roleGate.code }));
      }
  
      for (const uid of new Set(newIds)) {
        await prisma.groupDmMember.upsert({
          where: { groupDmId_userId: { groupDmId, userId: uid } },
          create: { groupDmId, userId: uid, role: "MEMBER", canPost: true },
          update: { leftAt: null, role: "MEMBER" },
        });
      }
  
      const updated = await prisma.groupDm.findUnique({
        where: { id: groupDmId },
        include: {
          members: { where: { leftAt: null }, include: { user: { select: { id: true, full_name: true, avatarUrl: true } } } },
        },
      });
  
      const updatedDto = toGroupDmDto(updated);

      try {
        const io = getIo();
        if (io) {
          io.to(`groupdm:${groupDmId}`).emit("groupdm:member:add", {
            groupDmId: member.groupDm.publicId,
            groupDm: updatedDto,
          });
        }
      } catch (e) {
        console.warn("groupdm member socket emit failed", e?.message);
      }

      return res.json({ groupDm: updatedDto });
    } catch (error) {
      console.error("POST /discussions/group-dms/:id/members failed", error);
      return res.status(500).json(apiErrorBody("Failed to add members", null));
    }
  });
}
