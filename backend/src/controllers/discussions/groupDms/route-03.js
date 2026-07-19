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
  router.post("/group-dms/direct", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
  
      const targetUserId = Number(req.body?.targetUserId);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json(apiErrorBody("targetUserId is required", null));
      }
      if (targetUserId === userId) {
        return res.status(400).json(apiErrorBody("You can’t start a DM with yourself", null));
      }
  
      const target = await prisma.user.findFirst({
        where: { id: targetUserId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!target) {
        return res.status(404).json(apiErrorBody("User not found", null));
      }
  
      // Must share a FACULTY_SERVER / USER_SERVER — identical circle rule to
      // member-candidates above.
      const myServers = await prisma.discussionGroupMembership.findMany({
        where: {
          userId,
          leftAt: null,
          isActive: true,
          group: { status: "ACTIVE", kind: { in: ["FACULTY_SERVER", "USER_SERVER"] } },
        },
        select: { groupId: true },
      });
      const serverIds = [...new Set(myServers.map((x) => x.groupId))];
      const sharesServer =
        serverIds.length > 0 &&
        (await prisma.discussionGroupMembership.count({
          where: { groupId: { in: serverIds }, userId: targetUserId, leftAt: null, isActive: true },
        })) > 0;
      if (!sharesServer) {
        return res
          .status(403)
          .json(apiErrorBody("You can only message people you share a group with", null));
      }
  
      const includeShape = {
        members: {
          where: { leftAt: null },
          include: { user: { select: { id: true, full_name: true, email: true } } },
        },
      };
  
      // Dedupe: find a non-archived DM whose active member set is exactly the pair.
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
        return res.status(200).json({ groupDm: existing, created: false });
      }
  
      const created = await prisma.$transaction(async (tx) => {
        const gd = await tx.groupDm.create({ data: { name: null, createdById: userId } });
        await tx.groupDmMember.createMany({
          data: [
            { groupDmId: gd.id, userId, role: "OWNER", canPost: true },
            { groupDmId: gd.id, userId: targetUserId, role: "MEMBER", canPost: true },
          ],
        });
        return tx.groupDm.findUnique({ where: { id: gd.id }, include: includeShape });
      });
  
      try {
        const io = getIo();
        if (io && created) {
          for (const uid of [userId, targetUserId]) {
            io.to(`user:${uid}`).emit("groupdm:new", { groupDm: created });
          }
        }
      } catch (e) {
        console.warn("groupdm:new (direct) socket emit failed", e?.message);
      }
  
      return res.status(201).json({ groupDm: created, created: true });
    } catch (error) {
      console.error("POST /discussions/group-dms/direct failed", error);
      return res.status(500).json(apiErrorBody("Failed to open direct message", null));
    }
  });
}
