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
  router.delete("/group-dms/:groupDmId/members/:targetUserId", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const groupDmId = Number(req.params.groupDmId);
      const targetUserId = Number(req.params.targetUserId);
  
      const self = await getActiveMember(groupDmId, userId);
      if (!self?.groupDm || self.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
  
      const isSelf = targetUserId === userId;
      const isOwner = self.role === "OWNER";
      if (!isSelf && !isOwner) {
        return res.status(403).json(apiErrorBody("Only the owner can remove others", null));
      }
  
      await prisma.groupDmMember.updateMany({
        where: { groupDmId, userId: targetUserId, leftAt: null },
        data: { leftAt: new Date() },
      });
  
      const remaining = await prisma.groupDmMember.count({
        where: { groupDmId, leftAt: null },
      });
      if (remaining < 2) {
        await prisma.groupDm.update({
          where: { id: groupDmId },
          data: { archivedAt: new Date() },
        });
      } else {
        const activeOwner = await prisma.groupDmMember.findFirst({
          where: { groupDmId, role: "OWNER", leftAt: null },
        });
        if (!activeOwner) {
          const next = await prisma.groupDmMember.findFirst({
            where: { groupDmId, leftAt: null },
            orderBy: { joinedAt: "asc" },
          });
          if (next) {
            await prisma.groupDmMember.update({
              where: { id: next.id },
              data: { role: "OWNER" },
            });
          }
        }
      }
  
      try {
        const io = getIo();
        if (io) {
          io.to(`groupdm:${groupDmId}`).emit("groupdm:member:remove", { groupDmId, userId: targetUserId });
        }
      } catch (e) {
        console.warn("groupdm remove socket emit failed", e?.message);
      }
  
      return res.json({ ok: true });
    } catch (error) {
      console.error("DELETE /discussions/group-dms/:id/members/:uid failed", error);
      return res.status(500).json(apiErrorBody("Failed to update membership", null));
    }
  });
}
