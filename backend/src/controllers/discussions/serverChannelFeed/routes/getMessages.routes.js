import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody, prismaSchemaDriftHint } from "../../../../utils/apiEnvelope.js";
import {
  PERMISSION_BITS,
  requireChannelPermission,
} from "../../../../features/discussions/permissions.js";
import { mapChannelMessagesForViewer } from "../../../../features/discussions/serverChannelAccess.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../../../features/discussions/discussionPagination.js";
import { getDiscussionCallerUserId } from "../../../../features/discussions/discussionCaller.js";
import { enrichDiscussionMessagesAttachments } from "../../../../features/discussions/discussionAttachments.js";
import { CHANNEL_MSG_INCLUDE, buildChannelThreadPreviewMap } from "../shared.js";

const router = express.Router();

router.get(
  "/channels/:channelId/messages",
  requireChannelPermission(PERMISSION_BITS.READ_MESSAGE_HISTORY),
  async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const channelId = req.discussionChannelId;
      const channelForMember = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true },
      });
      const channelMembership = channelForMember
        ? await prisma.discussionGroupMembership.findFirst({
            where: { groupId: channelForMember.serverId, userId, leftAt: null, isActive: true },
          })
        : null;
      const limit = parseDiscussionHistoryLimit(req.query.limit);
      const cursor = decodeDiscussionCursor(req.query.cursor);
      const threadRootRaw =
        req.query.threadRoot != null
          ? Number(req.query.threadRoot)
          : req.query.parentId != null
            ? Number(req.query.parentId)
            : null;
      const threadRoot =
        Number.isInteger(threadRootRaw) && threadRootRaw > 0 ? threadRootRaw : null;

      if (threadRoot) {
        const root = await prisma.discussionMessage.findFirst({
          where: { id: threadRoot, channelId, deletedAt: null },
          include: CHANNEL_MSG_INCLUDE,
        });
        if (!root) {
          return res.json({ results: [], nextCursor: null, hasMore: false, threadRoot });
        }
        const whereReplies = {
          channelId,
          deletedAt: null,
          parentMessageId: threadRoot,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        };
        const replies = await prisma.discussionMessage.findMany({
          where: whereReplies,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
          include: CHANNEL_MSG_INCLUDE,
        });
        const hasMore = replies.length > limit;
        const slice = hasMore ? replies.slice(0, limit) : replies;
        const nextCursor =
          hasMore && slice.length > 0
            ? encodeDiscussionCursor(slice[slice.length - 1].createdAt, slice[slice.length - 1].id)
            : null;
        const repliesAsc = slice.slice().reverse();
        const combined = cursor ? repliesAsc : [root, ...repliesAsc];
        return res.json({
          results: mapChannelMessagesForViewer(
            enrichDiscussionMessagesAttachments(req, combined, userId),
            userId,
            channelMembership,
          ),
          nextCursor,
          hasMore,
          threadRoot,
        });
      }

      const baseWhere = {
        channelId,
        deletedAt: null,
        parentMessageId: null,
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
        where: baseWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        include: CHANNEL_MSG_INCLUDE,
      });

      const hasMore = messages.length > limit;
      const pageRows = hasMore ? messages.slice(0, limit) : messages;
      const nextCursor =
        hasMore && pageRows.length
          ? encodeDiscussionCursor(pageRows[pageRows.length - 1].createdAt, pageRows[pageRows.length - 1].id)
          : null;

      let resultsPayload = pageRows.slice().reverse();
      if (resultsPayload.length > 0) {
        const rootIds = resultsPayload.map((m) => m.id);
        const previewByRoot = await buildChannelThreadPreviewMap(channelId, rootIds);
        resultsPayload = resultsPayload.map((m) => ({
          ...m,
          threadPreview: previewByRoot.get(m.id) ?? null,
        }));
      }

      return res.json({
        results: mapChannelMessagesForViewer(
          enrichDiscussionMessagesAttachments(req, resultsPayload, userId),
          userId,
          channelMembership,
        ),
        nextCursor,
        hasMore,
        threadRoot: null,
      });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/messages failed", error);
      const hint = prismaSchemaDriftHint(error);
      return res.status(500).json(apiErrorBody(`Failed to load messages.${hint}`, null));
    }
  },
);

export default router;
