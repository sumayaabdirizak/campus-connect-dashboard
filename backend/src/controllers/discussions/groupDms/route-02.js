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
import { assertUserCanUseGroupDms } from "../../../services/discussions/groupDmEligibility.js";
import { assertAllUsersDmEligible } from "../../../services/discussions/assertAllUsersDmEligible.js";
import { assertAoDeanGroupMembers } from "../../../services/discussions/assertAoDeanGroupMembers.js";
import { assertDeanFacultyGroupMembers } from "../../../services/discussions/assertDeanFacultyGroupMembers.js";

import { getActiveMember, MIN_TOTAL_MEMBERS, MAX_TOTAL_MEMBERS, toGroupDmDto } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post("/group-dms", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

      const callerGate = await assertUserCanUseGroupDms(userId);
      if (!callerGate.ok) {
        return res
          .status(callerGate.status)
          .json(apiErrorBody(callerGate.message, { code: callerGate.code }));
      }
  
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

      const roleGate =
        callerGate.user.roleName === "ACADEMIC_OFFICE"
          ? await assertAoDeanGroupMembers(userId, unique)
          : callerGate.user.roleName === "DEAN"
            ? await assertDeanFacultyGroupMembers(userId, unique)
            : await assertAllUsersDmEligible(unique);
      if (!roleGate.ok) {
        return res.status(roleGate.status).json(apiErrorBody(roleGate.message, { code: roleGate.code }));
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
              include: { user: { select: { id: true, full_name: true, email: true, avatarUrl: true } } },
            },
          },
        });
      });
  
      const createdDto = toGroupDmDto(created);

      try {
        const io = getIo();
        if (io && created) {
          for (const uid of unique) {
            io.to(`user:${uid}`).emit("groupdm:new", { groupDm: createdDto });
          }
        }
      } catch (e) {
        console.warn("groupdm:new socket emit failed", e?.message);
      }

      return res.status(201).json({ groupDm: createdDto });
    } catch (error) {
      console.error("POST /discussions/group-dms failed", error);
      return res.status(500).json(apiErrorBody("Failed to create group DM", null));
    }
  });
}
