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
  router.get("/group-dms/:groupDmId/messages", async (req, res) => {
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
  
      const limit = parseDiscussionHistoryLimit(req.query.limit);
      const cursor = decodeDiscussionCursor(req.query.cursor);
      const where = {
        groupDmId,
        deletedAt: null,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      };
  
      const messages = await prisma.discussionMessage.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        include: {
          sender: { select: { id: true, full_name: true } },
          attachments: true,
          reactions: { include: { user: { select: { id: true, full_name: true } } } },
        },
      });
  
      const hasMore = messages.length > limit;
      const pageRows = hasMore ? messages.slice(0, limit) : messages;
      const nextCursor =
        hasMore && pageRows.length
          ? encodeDiscussionCursor(pageRows[pageRows.length - 1].createdAt, pageRows[pageRows.length - 1].id)
          : null;
  
      return res.json({
        results: pageRows.reverse(),
        nextCursor,
        hasMore,
      });
    } catch (error) {
      console.error("GET /discussions/group-dms/:id/messages failed", error);
      return res.status(500).json(apiErrorBody("Failed to load messages", null));
    }
  });
}
