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
  router.post("/group-dms", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
  
      const parsed = createGroupDmSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }
      const { name, memberUserIds } = parsed.data;
      const unique = new Set([userId, ...memberUserIds]);
      if (unique.size < MIN_TOTAL_MEMBERS) {
        return res.status(400).json(
          apiErrorBody(`At least ${MIN_TOTAL_MEMBERS} distinct members are required`, {
            code: "GROUP_DM_MIN_MEMBERS",
          })
        );
      }
      if (unique.size > MAX_TOTAL_MEMBERS) {
        return res.status(400).json(
          apiErrorBody(`At most ${MAX_TOTAL_MEMBERS} members are allowed`, { code: "GROUP_DM_MAX_MEMBERS" })
        );
      }
  
      const users = await prisma.user.findMany({
        where: { id: { in: [...unique] }, status: "ACTIVE" },
        select: { id: true },
      });
      if (users.length !== unique.size) {
        return res.status(400).json(apiErrorBody("One or more users are invalid or inactive", null));
      }
  
      const created = await prisma.$transaction(async (tx) => {
        const gd = await tx.groupDm.create({
          data: {
            name: name?.trim() || null,
            createdById: userId,
          },
        });
        for (const uid of unique) {
          await tx.groupDmMember.create({
            data: {
              groupDmId: gd.id,
              userId: uid,
              role: uid === userId ? "OWNER" : "MEMBER",
              canPost: true,
            },
          });
        }
        return tx.groupDm.findUnique({
          where: { id: gd.id },
          include: {
            members: {
              where: { leftAt: null },
              include: { user: { select: { id: true, full_name: true, email: true } } },
            },
          },
        });
      });
  
      try {
        const io = getIo();
        if (io && created) {
          for (const uid of unique) {
            io.to(`user:${uid}`).emit("groupdm:new", { groupDm: created });
          }
        }
      } catch (e) {
        console.warn("groupdm:new socket emit failed", e?.message);
      }
  
      return res.status(201).json({ groupDm: created });
    } catch (error) {
      console.error("POST /discussions/group-dms failed", error);
      return res.status(500).json(apiErrorBody("Failed to create group DM", null));
    }
  });
}
