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

import { getActiveMember } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post("/group-dms/:groupDmId/leave", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

      const self = await getActiveMember(req.params.groupDmId, userId);
      if (!self?.groupDm || self.groupDm.archivedAt) {
        return res.status(404).json(apiErrorBody("Group DM not found", null));
      }
      const groupDmId = self.groupDm.id;
      const groupDmPublicId = self.groupDm.publicId;

      const wasOwner = self.role === "OWNER";
      let archived = false;
      let newOwnerId = null;
  
      await prisma.$transaction(async (tx) => {
        await tx.groupDmMember.updateMany({
          where: { groupDmId, userId, leftAt: null },
          data: { leftAt: new Date() },
        });
        const remaining = await tx.groupDmMember.findMany({
          where: { groupDmId, leftAt: null },
          orderBy: { joinedAt: "asc" },
          take: 1,
        });
        if (remaining.length === 0) {
          await tx.groupDm.update({
            where: { id: groupDmId },
            data: { archivedAt: new Date() },
          });
          archived = true;
        } else if (wasOwner) {
          const heir = remaining[0];
          await tx.groupDmMember.update({
            where: { id: heir.id },
            data: { role: "OWNER" },
          });
          newOwnerId = Number(heir.userId);
        }
      });
  
      try {
        const io = getIo();
        if (io) {
          const payload = { groupDmId: groupDmPublicId, userId, archived, newOwnerId };
          io.to(`groupdm:${groupDmId}`).emit("groupdm:member:leave", payload);
          io.to(`user:${userId}`).emit("groupdm:member:leave", payload);
        }
      } catch (e) {
        console.warn("groupdm leave socket emit failed", e?.message);
      }
  
      return res.json({ ok: true, archived, newOwnerId });
    } catch (error) {
      console.error("POST /discussions/group-dms/:id/leave failed", error);
      return res.status(500).json(apiErrorBody("Failed to leave group DM", null));
    }
  });
}
