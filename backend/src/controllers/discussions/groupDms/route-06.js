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
  router.post("/group-dms/:groupDmId/messages", async (req, res) => {
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
      if (!member.canPost) {
        return res.status(403).json(apiErrorBody("Posting is disabled for you in this group DM", null));
      }
  
      const parsed = groupDmSendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }
      const body = parsed.data;
      const text = body.content?.trim() || "";
      if (!text && body.messageType !== "MEDIA") {
        return res.status(400).json(apiErrorBody("content is required", null));
      }
  
      const message = await prisma.discussionMessage.create({
        data: {
          groupId: null,
          channelId: null,
          groupDmId,
          senderId: userId,
          content: text || null,
          messageType: body.messageType,
          parentMessageId: body.parentMessageId ?? null,
        },
        include: {
          sender: { select: { id: true, full_name: true } },
          attachments: true,
          reactions: true,
        },
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
              groupDmId,
              messageId: message.id,
              senderId: userId,
              senderName: message.sender?.full_name ?? null,
            },
          })),
        });
      }
  
      const out = { ...message, groupDmId };
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
