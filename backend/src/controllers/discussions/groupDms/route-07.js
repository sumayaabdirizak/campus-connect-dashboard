/**
 * Group DMs (3–10 members, no 1:1). Mounted at `/api/discussions`.
 */

import express from "express";
import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { getIo } from "../../../socket/hub.js";
import { buildUnreadSocketPayload } from "../../../features/discussions/buildUnreadPayload.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../../features/discussions/discussionPagination.js";
import { getDiscussionCallerUserId } from "../../../features/discussions/discussionCaller.js";
import {
  createGroupDmSchema,
  groupDmSendMessageSchema,
  addGroupDmMembersSchema,
} from "../../../features/discussions/validation/groupDiscussionSchemas.js";

import { getActiveMember } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post("/group-dms/:groupDmId/members", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const groupDmId = Number(req.params.groupDmId);
      const parsed = addGroupDmMembersSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }
  
      const member = await getActiveMember(groupDmId, userId);
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
  
      const currentCount = await prisma.groupDmMember.count({
        where: { groupDmId, leftAt: null },
      });
      const newIds = parsed.data.userIds.filter((id) => id !== userId);
      if (currentCount + newIds.length > MAX_TOTAL_MEMBERS) {
        return res.status(400).json(apiErrorBody("Member limit exceeded", null));
      }
  
      const users = await prisma.user.findMany({
        where: { id: { in: newIds }, status: "ACTIVE" },
        select: { id: true },
      });
      if (users.length !== new Set(newIds).size) {
        return res.status(400).json(apiErrorBody("Invalid user ids", null));
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
          members: { where: { leftAt: null }, include: { user: { select: { id: true, full_name: true } } } },
        },
      });
  
      try {
        const io = getIo();
        if (io) {
          io.to(`groupdm:${groupDmId}`).emit("groupdm:member:add", { groupDmId, groupDm: updated });
        }
      } catch (e) {
        console.warn("groupdm member socket emit failed", e?.message);
      }
  
      return res.json({ groupDm: updated });
    } catch (error) {
      console.error("POST /discussions/group-dms/:id/members failed", error);
      return res.status(500).json(apiErrorBody("Failed to add members", null));
    }
  });
}
