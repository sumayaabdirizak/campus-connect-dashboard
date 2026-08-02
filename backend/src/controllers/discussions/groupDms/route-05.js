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
import {
  REPLY_TO_INCLUDE,
  resolveReplyToMessageId,
} from '../../../features/discussions/replyToMessage.js';
import { toDiscussionAttachmentDto } from '../../../features/discussions/discussionAttachments.js';
import { buildMessagePublicIdMap, toMessageDto } from '../messageShared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get("/group-dms/:groupDmId/messages", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const member = await getActiveMember(req.params.groupDmId, userId);
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
      const groupDmId = member.groupDm.id;
      const groupDmPublicId = member.groupDm.publicId;

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
          sender: { select: { id: true, full_name: true, avatarUrl: true } },
          attachments: true,
          reactions: { include: { user: { select: { id: true, full_name: true } } } },
          ...REPLY_TO_INCLUDE,
        },
      });
  
      const hasMore = messages.length > limit;
      const pageRows = hasMore ? messages.slice(0, limit) : messages;
      const nextCursor =
        hasMore && pageRows.length
          ? encodeDiscussionCursor(pageRows[pageRows.length - 1].createdAt, pageRows[pageRows.length - 1].id)
          : null;

      // `size` is a Prisma BigInt — not JSON-serializable as-is. `groupDmId`
      // is the internal int FK Prisma auto-includes — swap for the UUID.
      const reversed = pageRows.reverse();
      const publicIdById = await buildMessagePublicIdMap(reversed);
      const resultsOut = reversed.map((m) => ({
        ...toMessageDto(m, publicIdById),
        groupDmId: groupDmPublicId,
        attachments: (m.attachments || []).map((a) => toDiscussionAttachmentDto(req, a, userId)),
      }));

      return res.json({
        results: resultsOut,
        nextCursor,
        hasMore,
      });
    } catch (error) {
      console.error("GET /discussions/group-dms/:id/messages failed", error);
      return res.status(500).json(apiErrorBody("Failed to load messages", null));
    }
  });
}
