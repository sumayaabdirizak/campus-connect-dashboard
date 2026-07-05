import express from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody, prismaSchemaDriftHint } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import { extractMentionHandles, resolveMentionUserIds } from "../../features/discussions/mentionResolution.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
  deriveQuestionFields,
} from "../../features/discussions/discussionMessagePublic.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../features/discussions/discussionPagination.js";
import {
  requireActiveDiscussionMembership,
  resolveDiscussionE2EERequirement,
} from "../../features/discussions/discussionMembership.js";
import {
  collectThreadParticipantSenderIds,
  resolveThreadRootMessageId,
} from "../../features/discussions/threadParticipants.js";
import { buildUnreadSocketPayload } from "../../features/discussions/buildUnreadPayload.js";
import { toDiscussionAttachmentDto } from "../../features/discussions/discussionAttachments.js";
import { sendMessageSchema } from "../../features/discussions/validation/groupDiscussionSchemas.js";

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
      parentIdRaw != null && String(parentIdRaw).trim() !== ""
        ? Number(parentIdRaw)
        : null;
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
      whereParts.push({
        OR: [{ channelId: null }, { channelId: groupRow.defaultChannelId }],
      });
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

    const hydrated = pageRows
      .reverse()
      .map((message) => {
        const base = {
          ...message,
          attachments: (message.attachments || []).map((attachment) =>
            toDiscussionAttachmentDto(req, attachment, userId)
          ),
        };
        return applyAnonymousSenderPolicy(base, userId, membership);
      });

    let resultsPayload = hydrated;
    if (parentMessageId == null && hydrated.length > 0) {
      const rootIds = hydrated.map((m) => m.id);
      const [countRows, recentReplies] = await Promise.all([
        prisma.discussionMessage.groupBy({
          by: ["parentMessageId"],
          where: { groupId, deletedAt: null, parentMessageId: { in: rootIds } },
          _count: { id: true },
        }),
        prisma.discussionMessage.findMany({
          where: { groupId, deletedAt: null, parentMessageId: { in: rootIds } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 400,
          select: {
            parentMessageId: true,
            createdAt: true,
            senderId: true,
            isAnonymous: true,
            sender: { select: { id: true, full_name: true } },
          },
        }),
      ]);
      const previewByRoot = new Map();
      for (const row of countRows) {
        previewByRoot.set(row.parentMessageId, {
          replyCount: row._count.id,
          lastReplyAt: null,
          previewSenders: [],
        });
      }
      for (const r of recentReplies) {
        const pid = r.parentMessageId;
        if (pid == null) continue;
        const pr = previewByRoot.get(pid);
        if (!pr) continue;
        if (!pr.lastReplyAt) pr.lastReplyAt = r.createdAt.toISOString();
        if (pr.previewSenders.length < 2 && (r.senderId || r.isAnonymous)) {
          const sid = r.isAnonymous ? 0 : Number(r.senderId);
          const name = r.isAnonymous ? "Anonymous" : r.sender?.full_name ?? "Member";
          if (!pr.previewSenders.some((s) => s.id === sid && s.full_name === name)) {
            pr.previewSenders.push({
              id: sid,
              full_name: name,
            });
          }
        }
      }
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

router.post("/groups/:groupId/messages", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!membership.canPost) return res.status(403).json(apiErrorBody("Posting is disabled for this user", null));

    const parsed = sendMessageSchema.parse(req.body ?? {});
    const attachmentIds = parsed.attachmentIds ?? [];
    const parentMessageId = parsed.parentMessageId ?? null;

    const derived = deriveQuestionFields({
      content: parsed.content ?? "",
      messageType: parsed.messageType,
      postAsQuestion: parsed.postAsQuestion,
      isAnonymous: parsed.isAnonymous,
      parentMessageId,
    });
    const effectiveContent = derived.contentStored.trim();
    const hasText = effectiveContent.length > 0;
    let messageType =
      attachmentIds.length > 0 && !hasText ? "MEDIA" : derived.messageType;
    let isAnonymousFlag = derived.isAnonymous;
    if (messageType !== "QUESTION") isAnonymousFlag = false;
    if (messageType === "QUESTION" && !hasText) {
      return res.status(400).json(apiErrorBody("Question text is required", null));
    }
    const e2eeRequired = await resolveDiscussionE2EERequirement(groupId);
    if (e2eeRequired && !parsed.e2e) {
      return res.status(400).json(
        apiErrorBody(
          "E2E payload is required for this group (ciphertext, nonce, keyVersion, senderDeviceId)",
          null
        )
      );
    }
    if (!hasText && attachmentIds.length === 0) {
      return res.status(400).json(apiErrorBody("Either content or attachmentIds is required", null));
    }

    if (parentMessageId != null) {
      const parent = await prisma.discussionMessage.findFirst({
        where: {
          id: parentMessageId,
          groupId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!parent) {
        return res.status(400).json(apiErrorBody("parentMessageId not found in this group", null));
      }
    }

    let pendingAttachments = [];
    if (attachmentIds.length > 0) {
      pendingAttachments = await prisma.discussionAttachment.findMany({
        where: {
          id: { in: attachmentIds },
          uploadedById: userId,
          status: "PENDING",
          messageId: null,
          OR: [{ groupId }, { groupId: null }],
        },
      });
      if (pendingAttachments.length !== attachmentIds.length) {
        return res.status(400).json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
      }
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.discussionMessage.create({
        data: {
          groupId,
          senderId: userId,
          parentMessageId: parentMessageId ?? undefined,
          content: e2eeRequired ? null : hasText ? effectiveContent : null,
          messageType,
          isAnonymous: isAnonymousFlag,
          ciphertext: parsed.e2e?.ciphertext ?? null,
          nonce: parsed.e2e?.nonce ?? null,
          keyVersion: parsed.e2e?.keyVersion ?? null,
          senderDeviceId: parsed.e2e?.senderDeviceId ?? null,
        },
        include: {
          sender: { select: { id: true, full_name: true } },
        },
      });

      if (attachmentIds.length > 0) {
        await tx.discussionAttachment.updateMany({
          where: { id: { in: attachmentIds }, uploadedById: userId, messageId: null },
          data: { messageId: created.id, groupId, status: "LINKED" },
        });
      }

      const members = await tx.discussionGroupMembership.findMany({
        where: { groupId, leftAt: null, isActive: true, userId: { not: userId } },
        select: {
          userId: true,
          user: { select: { id: true, number: true, full_name: true } },
        },
      });
      const memberRows = members.map((m) => ({
        userId: m.userId,
        number: m.user?.number ?? "",
        full_name: m.user?.full_name ?? "",
      }));
      const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));

      const plaintext = e2eeRequired ? "" : hasText ? effectiveContent : "";
      const handles = extractMentionHandles(plaintext);
      const mentionUserIds = new Set(
        resolveMentionUserIds(handles, memberRows, userId).filter((id) => memberIdSet.has(id))
      );

      const recipientIds = members.map((member) => Number(member.userId));
      const messageRecipients = recipientIds.filter((rid) => !mentionUserIds.has(rid));
      if (messageRecipients.length) {
        await tx.discussionNotification.createMany({
          data: messageRecipients.map((recipientId) => ({
            userId: recipientId,
            groupId,
            messageId: created.id,
            type: "MESSAGE",
            payload: {
              groupId,
              messageId: created.id,
              senderId: userId,
              senderName: anonymousSafeSenderName({ isAnonymous: isAnonymousFlag, sender: created.sender }),
            },
          })),
        });
      }
      if (mentionUserIds.size) {
        await tx.discussionNotification.createMany({
          data: [...mentionUserIds].map((recipientId) => ({
            userId: recipientId,
            groupId,
            messageId: created.id,
            type: "MENTION",
            payload: {
              groupId,
              messageId: created.id,
              senderId: userId,
              senderName: anonymousSafeSenderName({ isAnonymous: isAnonymousFlag, sender: created.sender }),
            },
          })),
        });
      }

      if (parentMessageId != null) {
        const rootId = await resolveThreadRootMessageId(tx, {
          groupId,
          channelId: null,
          replyParentMessageId: parentMessageId,
        });
        if (rootId != null) {
          const threadTargets = await collectThreadParticipantSenderIds(tx, {
            groupId,
            channelId: null,
            rootMessageId: rootId,
            excludeUserId: userId,
          });
          if (threadTargets.length > 0) {
            await tx.discussionNotification.createMany({
              data: threadTargets.map((uid) => ({
                userId: uid,
                groupId,
                messageId: created.id,
                type: "THREAD",
                payload: {
                  groupId,
                  messageId: created.id,
                  threadRootMessageId: rootId,
                  senderId: userId,
                  senderName: anonymousSafeSenderName({ isAnonymous: isAnonymousFlag, sender: created.sender }),
                },
              })),
            });
          }
        }
      }

      return created;
    });

    const fullMessage = await prisma.discussionMessage.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
      },
    });
    const fullMessageDtoRaw = {
      ...fullMessage,
      attachments: (fullMessage?.attachments || []).map((attachment) =>
        toDiscussionAttachmentDto(req, attachment, userId)
      ),
    };
    const fullMessageDto = applyAnonymousSenderPolicy(fullMessageDtoRaw, userId, membership);
    const wsMessageDto = fullMessageDtoRaw.isAnonymous
      ? applyAnonymousSenderPolicy(fullMessageDtoRaw, null, null, { broadcast: true })
      : fullMessageDtoRaw;

    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("discussion:message:new", wsMessageDto);
      const unread = await prisma.discussionNotification.groupBy({
        by: ["userId", "groupId"],
        where: {
          readAt: null,
          groupId,
          userId: { not: userId },
        },
        _count: { groupId: true },
      });
      const users = [...new Set(unread.map((u) => Number(u.userId)))];
      for (const uid of users) {
        const payload = await buildUnreadSocketPayload(uid);
        io.to(`user:${uid}`).emit("unread:update", payload);
      }
    }

    return res.status(201).json(fullMessageDto);
  } catch (error) {
    console.error("POST /discussions/groups/:groupId/messages failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to send message", null));
  }
});
export default router;
