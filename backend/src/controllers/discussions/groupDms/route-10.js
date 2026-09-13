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
import { buildMessagePublicIdMap } from '../messageShared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get("/group-dms/:groupDmId/receipts", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const member = await getActiveMember(req.params.groupDmId, userId);
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
      const groupDmId = member.groupDm.id;

      // Receipts for any message in this DM, sorted so the highest messageId
      // per user comes first. We then dedupe by userId in memory — small
      // payload (one row per member at most).
      const rows = await prisma.discussionReadReceipt.findMany({
        where: { message: { groupDmId } },
        select: { userId: true, messageId: true, readAt: true },
        orderBy: [{ messageId: "desc" }],
      });
      const seen = new Set();
      const dedupedRows = [];
      for (const r of rows) {
        const uid = Number(r.userId);
        if (seen.has(uid)) continue;
        seen.add(uid);
        dedupedRows.push(r);
      }
      const publicIdById = await buildMessagePublicIdMap([], dedupedRows.map((r) => Number(r.messageId)));
      const results = dedupedRows.map((r) => ({
        userId: Number(r.userId),
        messageId: publicIdById.get(Number(r.messageId)) ?? null,
        readAt: r.readAt.toISOString(),
      }));
      return res.json({ results });
    } catch (error) {
      console.error("GET /discussions/group-dms/:id/receipts failed", error);
      return res.status(500).json(apiErrorBody("Failed to load receipts", null));
    }
  });
}
