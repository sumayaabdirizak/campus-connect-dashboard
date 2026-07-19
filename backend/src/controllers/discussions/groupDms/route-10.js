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
  router.get("/group-dms/:groupDmId/receipts", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const groupDmId = Number(req.params.groupDmId);
      if (!Number.isInteger(groupDmId) || groupDmId <= 0) {
        return res.status(400).json(apiErrorBody("Invalid groupDmId", null));
      }
      const member = await getActiveMember(groupDmId, userId);
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
  
      // Receipts for any message in this DM, sorted so the highest messageId
      // per user comes first. We then dedupe by userId in memory — small
      // payload (one row per member at most).
      const rows = await prisma.discussionReadReceipt.findMany({
        where: { message: { groupDmId } },
        select: { userId: true, messageId: true, readAt: true },
        orderBy: [{ messageId: "desc" }],
      });
      const seen = new Set();
      const results = [];
      for (const r of rows) {
        const uid = Number(r.userId);
        if (seen.has(uid)) continue;
        seen.add(uid);
        results.push({
          userId: uid,
          messageId: Number(r.messageId),
          readAt: r.readAt.toISOString(),
        });
      }
      return res.json({ results });
    } catch (error) {
      console.error("GET /discussions/group-dms/:id/receipts failed", error);
      return res.status(500).json(apiErrorBody("Failed to load receipts", null));
    }
  });
}
