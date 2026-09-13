import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody, prismaSchemaDriftHint } from "../../../../utils/apiEnvelope.js";
import { applyAnonymousSenderPolicy } from "../../../../services/discussions/discussionMessagePublic.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../../../services/discussions/discussionPagination.js";
import { requireActiveDiscussionMembership } from "../../../../services/discussions/discussionMembership.js";
import { toDiscussionAttachmentDto } from "../../../../services/discussions/discussionAttachments.js";
import { buildGroupThreadPreviewMap } from "../../../../controllers/discussions/discussionGroupFeed/shared.js";
import { whereFromPublicId, whereFromParam } from "../../../../services/discussions/publicIdResolution.js";
import { buildMessagePublicIdMap, toMessageDto } from "../../../../controllers/discussions/messageShared.js";

const router = express.Router();

router.get("/groups/:groupId/messages", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const limit = parseDiscussionHistoryLimit(req.query.limit);
    const rawCursor = req.query.cursor;
    const hasCursor =
      rawCursor != null && String(rawCursor).trim() !== "" && String(rawCursor).toLowerCase() !== "null";
    const cursor = hasCursor ? decodeDiscussionCursor(rawCursor) : null;
    if (hasCursor && !cursor) {
      return res.status(400).json(apiErrorBody("Invalid or unreadable cursor", null));
    }
    const groupWhere = whereFromPublicId(req.params.groupId);
    if (!groupWhere) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const groupRowForId = await prisma.discussionGroup.findFirst({ where: groupWhere, select: { id: true, publicId: true } });
    if (!groupRowForId) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const groupId = groupRowForId.id;

    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));

    const groupRow = await prisma.discussionGroup.findUnique({
      where: { id: groupId },
      select: { kind: true, defaultChannelId: true },
    });

    const parentIdRaw = req.query.parentId ?? req.query.parentMessageId;
    let parentMessageId = null;
    if (parentIdRaw != null && String(parentIdRaw).trim() !== "") {
      const parentRow = await prisma.discussionMessage.findFirst({
        where: { ...(whereFromParam(parentIdRaw) ?? { id: -1 }), groupId, deletedAt: null },
        select: { id: true },
      });
      if (!parentRow) return res.status(400).json(apiErrorBody("Invalid parentId", null));
      parentMessageId = parentRow.id;
    }

    const whereParts = [{ groupId }, { deletedAt: null }];
    if (parentMessageId != null && Number.isFinite(parentMessageId)) {
      whereParts.push({ parentMessageId });
    } else {
      whereParts.push({ parentMessageId: null });
    }
    if (cursor) {
      whereParts.push({
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      });
    }
    if (
      groupRow &&
      (groupRow.kind === "FACULTY_SERVER" || groupRow.kind === "USER_SERVER") &&
      groupRow.defaultChannelId != null
    ) {
      whereParts.push({ OR: [{ channelId: null }, { channelId: groupRow.defaultChannelId }] });
    }
    const where = whereParts.length > 1 ? { AND: whereParts } : whereParts[0];

    const messages = await prisma.discussionMessage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        sender: { select: { id: true, full_name: true, avatarUrl: true } },
        attachments: true,
        // Selected, not included: the raw row carries the internal integer id
        // and messageId, which must not cross the wire (see messageShared.js).
        reactions: {
          select: {
            emoji: true,
            userId: true,
            createdAt: true,
            user: { select: { id: true, full_name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const hasMore = messages.length > limit;
    const pageRows = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor =
      hasMore && pageRows.length
        ? encodeDiscussionCursor(pageRows[pageRows.length - 1].createdAt, pageRows[pageRows.length - 1].id)
        : null;

    const hydrated = pageRows.reverse().map((message) => {
      const base = {
        ...message,
        attachments: (message.attachments || []).map((attachment) =>
          toDiscussionAttachmentDto(req, attachment, userId),
        ),
      };
      return applyAnonymousSenderPolicy(base, userId, membership);
    });

    let resultsPayload = hydrated;
    if (parentMessageId == null && hydrated.length > 0) {
      const rootIds = hydrated.map((m) => m.id);
      const previewByRoot = await buildGroupThreadPreviewMap(groupId, rootIds);
      resultsPayload = hydrated.map((m) => ({
        ...m,
        threadPreview: previewByRoot.get(m.id) ?? null,
      }));
    }
    const publicIdById = await buildMessagePublicIdMap(resultsPayload);
    resultsPayload = resultsPayload.map((m) => ({
      ...toMessageDto(m, publicIdById),
      groupId: groupRowForId.publicId,
    }));

    return res.json({
      results: resultsPayload,
      meta: {
        nextCursor,
        hasMore,
        parentMessageId: parentMessageId != null ? (publicIdById.get(parentMessageId) ?? null) : null,
      },
    });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId/messages failed", error);
    const hint = prismaSchemaDriftHint(error);
    return res.status(500).json(apiErrorBody(`Failed to fetch messages.${hint}`, null));
  }
});

export default router;
