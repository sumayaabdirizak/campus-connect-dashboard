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
  router.get("/group-dms/:groupDmId", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const groupDmId = Number(req.params.groupDmId);
      if (!Number.isInteger(groupDmId) || groupDmId <= 0) {
        return res.status(400).json(apiErrorBody("Invalid groupDmId", null));
      }
      const member = await getActiveMember(groupDmId, userId);
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return res.status(404).json(apiErrorBody("Group DM not found", null));
      }
  
      const groupDm = await prisma.groupDm.findUnique({
        where: { id: groupDmId },
        include: {
          members: {
            where: { leftAt: null },
            include: { user: { select: { id: true, full_name: true, email: true } } },
          },
        },
      });
      return res.json({ groupDm, myRole: member.role });
    } catch (error) {
      console.error("GET /discussions/group-dms/:id failed", error);
      return res.status(500).json(apiErrorBody("Failed to load group DM", null));
    }
  });
}
