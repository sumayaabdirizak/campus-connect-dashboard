/**
 * Channel pinned messages routes.
 *
 *   GET    /channels/:channelId/pins
 *   POST   /channels/:channelId/pins
 *   DELETE /channels/:channelId/pins/:messageId
 */

import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import {
  PERMISSION_BITS,
  requireChannelPermission,
} from "../../features/discussions/permissions.js";
import {
  filterMembershipRowsByChannelScope,
} from "../../features/discussions/channelScopeAccess.js";
import { emitDiscussionNotificationEvents } from "../../features/discussions/notificationEmit.js";
import { recordDiscussionAuditLog } from "../../features/discussions/auditLog.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";

const router = express.Router();

router.get(
  "/channels/:channelId/pins",
  requireChannelPermission(PERMISSION_BITS.VIEW_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
      const rows = await prisma.discussionPinnedMessage.findMany({
        where: {
          groupId: channel.serverId,
          unpinnedAt: null,
          message: { channelId, deletedAt: null },
        },
        orderBy: { pinnedAt: "desc" },
        take: 50,
        include: {
          message: {
            include: {
              sender: { select: { id: true, full_name: true } },
            },
          },
          pinnedBy: { select: { id: true, full_name: true } },
        },
      });
      return res.json({ results: rows });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/pins failed", error);
      return res.status(500).json(apiErrorBody("Failed to load pins", null));
    }
  },
);

router.post(
  "/channels/:channelId/pins",
  requireChannelPermission(PERMISSION_BITS.PIN_MESSAGES),
  async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      const channelId = req.discussionChannelId;
      const messageId = Number(req.body?.messageId);
      if (!Number.isInteger(messageId) || messageId <= 0) {
        return res.status(400).json(apiErrorBody("messageId is required", null));
      }
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true, slug: true, name: true, scopeType: true, scopeId: true },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
      const msg = await prisma.discussionMessage.findFirst({
        where: {
          id: messageId,
          channelId,
          groupId: channel.serverId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!msg) return res.status(404).json(apiErrorBody("Message not found in this channel", null));
      const existing = await prisma.discussionPinnedMessage.findFirst({
        where: { messageId, unpinnedAt: null },
      });
      if (existing) {
        return res.status(409).json(apiErrorBody("Message is already pinned", null));
      }
      const pin = await prisma.discussionPinnedMessage.create({
        data: {
          groupId: channel.serverId,
          messageId,
          pinnedById: userId,
        },
        include: {
          message: { include: { sender: { select: { id: true, full_name: true } } } },
          pinnedBy: { select: { id: true, full_name: true } },
        },
      });
      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("channel:pins:update", { channelId, action: "pin", pin });
        }
      } catch (emitErr) {
        console.warn("channel pin socket emit failed", emitErr?.message);
      }
      const allPinMembers = await prisma.discussionGroupMembership.findMany({
        where: {
          groupId: channel.serverId,
          leftAt: null,
          isActive: true,
          userId: { not: userId },
        },
        select: { userId: true },
      });
      const pinMembers = await filterMembershipRowsByChannelScope(allPinMembers, channel);
      if (pinMembers.length > 0) {
        const pinner = await prisma.user.findUnique({
          where: { id: userId },
          select: { full_name: true },
        });
        const pinnedByName = pinner?.full_name ?? pin.pinnedBy?.full_name ?? null;
        await prisma.discussionNotification.createMany({
          data: pinMembers.map((m) => ({
            userId: m.userId,
            groupId: channel.serverId,
            messageId,
            type: "PIN",
            payload: {
              groupId: channel.serverId,
              channelId,
              channelSlug: channel.slug ?? null,
              messageId,
              pinnedById: userId,
              pinnedByName,
            },
          })),
        });
        await emitDiscussionNotificationEvents(
          pinMembers.map((m) => ({
            userId: m.userId,
            notification: {
              type: "PIN",
              groupId: channel.serverId,
              channelId,
              messageId,
              pinnedById: userId,
              pinnedByName,
            },
          }))
        );
      }
      if (userId) {
        await recordDiscussionAuditLog(prisma, {
          serverId: channel.serverId,
          channelId,
          actorUserId: userId,
          action: "MESSAGE_PIN",
          targetType: "MESSAGE",
          targetId: messageId,
          before: null,
          after: { pinId: pin.id },
        });
      }
      return res.status(201).json({ pin });
    } catch (error) {
      console.error("POST /discussions/channels/:channelId/pins failed", error);
      return res.status(500).json(apiErrorBody("Failed to pin message", null));
    }
  },
);

router.delete(
  "/channels/:channelId/pins/:messageId",
  requireChannelPermission(PERMISSION_BITS.PIN_MESSAGES),
  async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      const channelId = req.discussionChannelId;
      const messageId = Number(req.params.messageId);
      if (!Number.isInteger(messageId) || messageId <= 0) {
        return res.status(400).json(apiErrorBody("Invalid messageId", null));
      }
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
      const pinRow = await prisma.discussionPinnedMessage.findFirst({
        where: {
          groupId: channel.serverId,
          messageId,
          unpinnedAt: null,
          message: { channelId },
        },
        select: { id: true },
      });
      if (!pinRow) {
        return res.status(404).json(apiErrorBody("Active pin not found", null));
      }
      await prisma.discussionPinnedMessage.update({
        where: { id: pinRow.id },
        data: { unpinnedAt: new Date() },
      });
      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("channel:pins:update", {
            channelId,
            action: "unpin",
            messageId,
          });
        }
      } catch (emitErr) {
        console.warn("channel unpin socket emit failed", emitErr?.message);
      }
      if (userId) {
        await recordDiscussionAuditLog(prisma, {
          serverId: channel.serverId,
          channelId,
          actorUserId: userId,
          action: "MESSAGE_UNPIN",
          targetType: "MESSAGE",
          targetId: messageId,
          before: { pinId: pinRow.id },
          after: null,
        });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error("DELETE /discussions/channels/:channelId/pins/:messageId failed", error);
      return res.status(500).json(apiErrorBody("Failed to unpin message", null));
    }
  },
);

export default router;
