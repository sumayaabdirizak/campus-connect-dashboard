import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody, prismaSchemaDriftHint } from "../../../../utils/apiEnvelope.js";
import { applyAnonymousSenderPolicy } from "../../../../features/discussions/discussionMessagePublic.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../../../features/discussions/discussionPagination.js";
import { requireActiveDiscussionMembership } from "../../../../features/discussions/discussionMembership.js";
import { toDiscussionAttachmentDto } from "../../../../features/discussions/discussionAttachments.js";
import { buildGroupThreadPreviewMap } from "../shared.js";

const router = express.Router();

router.get("/groups/:groupId/messages", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    const limit = parseDiscussionHistoryLimit(req.query.limit);
    const rawCursor = req.query.cursor;
    const hasCursor =
      rawCursor != null && String(rawCursor).trim() !== "" && String(rawCursor).toLowerCase() !== "null";
    const cursor = hasCursor ? decodeDiscussionCursor(rawCursor) : null;
    if (hasCursor && !cursor) {
      return res.status(400).json(apiErrorBody("Invalid or unreadable cursor", null));
    }
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }

    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));

    const groupRow = await prisma.discussionGroup.findUnique({
      where: { id: groupId },
      select: { kind: true, defaultChannelId: true },
    });

    const parentIdRaw = req.query.parentId ?? req.query.parentMessageId;
    const parentMessageId =
      parentIdRaw != null && String(parentIdRaw).trim() !== "" ? Number(parentIdRaw) : null;
    if (parentMessageId != null && !Number.isFinite(parentMessageId)) {
      return res.status(400).json(apiErrorBody("Invalid parentId", null));
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
        sender: { select: { id: true, full_name: true } },
        attachments: true,
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

    return res.json({
      results: resultsPayload,
      meta: {
        nextCursor,
        hasMore,
        parentMessageId: parentMessageId != null && Number.isFinite(parentMessageId) ? parentMessageId : null,
      },
    });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId/messages failed", error);
    const hint = prismaSchemaDriftHint(error);
    return res.status(500).json(apiErrorBody(`Failed to fetch messages.${hint}`, null));
  }
});

export default router;
