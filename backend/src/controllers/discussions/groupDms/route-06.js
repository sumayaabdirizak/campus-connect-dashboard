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
import { resolveMessageRow, resolveAttachmentIds, buildMessagePublicIdMap, toMessageDto } from '../messageShared.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post("/group-dms/:groupDmId/messages", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const member = await getActiveMember(req.params.groupDmId, userId);
      if (!member?.groupDm || member.groupDm.archivedAt) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
      const groupDmId = member.groupDm.id;
      const groupDmPublicId = member.groupDm.publicId;
      if (!member.canPost) {
        return res.status(403).json(apiErrorBody("Posting is disabled for you in this group DM", null));
      }
  
      const parsed = groupDmSendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }
      const body = parsed.data;
      const text = body.content?.trim() || "";
      const hasAttachments = (body.attachmentIds?.length ?? 0) > 0;
      if (!text && body.messageType !== "MEDIA" && !hasAttachments) {
        return res.status(400).json(apiErrorBody("content is required", null));
      }

      const replyToId = await resolveReplyToMessageId(prisma, {
        replyToMessageId: body.replyToMessageId,
        groupDmId,
      });
      if (body.replyToMessageId != null && replyToId == null) {
        return res
          .status(400)
          .json(apiErrorBody("replyToMessageId must be a message in this conversation", null));
      }

      let parentMessageId = null;
      if (body.parentMessageId != null) {
        const parentRow = await resolveMessageRow(body.parentMessageId, { groupDmId });
        if (!parentRow) {
          return res
            .status(400)
            .json(apiErrorBody("parentMessageId must be a message in this conversation", null));
        }
        parentMessageId = parentRow.id;
      }

      const attachmentIds = await resolveAttachmentIds(body.attachmentIds ?? []);
      if (attachmentIds.length !== (body.attachmentIds?.length ?? 0)) {
        return res
          .status(400)
          .json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
      }
      const message = await prisma.$transaction(async (tx) => {
        const created = await tx.discussionMessage.create({
          data: {
            groupId: null,
            channelId: null,
            groupDmId,
            senderId: userId,
            content: text || null,
            messageType: body.messageType,
            parentMessageId,
            replyToMessageId: replyToId,
          },
        });

        if (attachmentIds.length > 0) {
          await tx.discussionAttachment.updateMany({
            where: { id: { in: attachmentIds }, uploadedById: userId, groupDmId, messageId: null },
            data: { messageId: created.id, status: "LINKED" },
          });
        }

        return tx.discussionMessage.findUnique({
          where: { id: created.id },
          include: {
            sender: { select: { id: true, full_name: true, avatarUrl: true } },
            attachments: true,
            reactions: true,
            ...REPLY_TO_INCLUDE,
          },
        });
      });
  
      const others = await prisma.groupDmMember.findMany({
        where: { groupDmId, userId: { not: userId }, leftAt: null },
        select: { userId: true },
      });
      const otherIds = others.map((o) => Number(o.userId));
      if (otherIds.length > 0) {
        await prisma.discussionNotification.createMany({
          data: otherIds.map((uid) => ({
            userId: uid,
            groupId: null,
            messageId: message.id,
            type: "MESSAGE",
            payload: {
              groupDmId: groupDmPublicId,
              messageId: message.publicId,
              senderId: userId,
              senderName: message.sender?.full_name ?? null,
            },
          })),
        });
      }

      const publicIdById = await buildMessagePublicIdMap([message]);
      const out = {
        ...toMessageDto(message, publicIdById),
        groupDmId: groupDmPublicId,
        // `size` is a Prisma BigInt — not JSON/socket-serializable as-is.
        attachments: (message.attachments || []).map((a) =>
          toDiscussionAttachmentDto(req, a, userId)
        ),
      };
      try {
        const io = getIo();
        if (io) {
          io.to(`groupdm:${groupDmId}`).emit("message:new", out);
          io.to(`groupdm:${groupDmId}`).emit("groupdm:message:new", out);
          for (const uid of otherIds) {
            const unreadPayload = await buildUnreadSocketPayload(uid);
            io.to(`user:${uid}`).emit("unread:update", unreadPayload);
          }
        }
      } catch (e) {
        console.warn("groupdm message socket emit failed", e?.message);
      }
  
      return res.status(201).json({ message: out });
    } catch (error) {
      console.error("POST /discussions/group-dms/:id/messages failed", error);
      return res.status(500).json(apiErrorBody("Failed to send message", null));
    }
  });
}
