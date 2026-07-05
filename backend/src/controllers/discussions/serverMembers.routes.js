/**
 * Server member moderation routes.
 *
 *   POST   /servers/:serverId/members/:targetUserId/mute   { until: ISO | null, auditChannelId?: number }
 *   DELETE /servers/:serverId/members/:targetUserId
 */

import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import {
  PERMISSION_BITS,
  requireServerPermission,
} from "../../features/discussions/permissions.js";
import { recordDiscussionAuditLog } from "../../features/discussions/auditLog.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";

const router = express.Router();

/**
 * Remove a member from a server (kick). Soft-delete via leftAt; the user
 * keeps their messages but is no longer a member. The user's own row in
 * server lists hides them. Caller needs MODERATE_MEMBERS.
 */
/**
 * Mute / unmute a member at the server level. Sets `mutedUntil` on the
 * membership row; the message-send handler refuses posts while the mute is
 * active. Pass `until: null` to lift a mute early.
 *
 *   POST /servers/:serverId/members/:userId/mute   { until: ISO | null, auditChannelId?: number }
 */
router.post(
  "/servers/:serverId/members/:targetUserId/mute",
  requireServerPermission(PERMISSION_BITS.MUTE_MEMBERS),
  async (req, res) => {
    try {
      const serverId = req.discussionServerId;
      const targetUserId = Number(req.params.targetUserId);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json(apiErrorBody("Invalid targetUserId", null));
      }
      const untilRaw = req.body?.until;
      let until = null;
      if (untilRaw != null && untilRaw !== "") {
        const dt = new Date(untilRaw);
        if (Number.isNaN(dt.getTime())) {
          return res.status(400).json(apiErrorBody("Invalid until", null));
        }
        if (dt.getTime() <= Date.now()) {
          return res
            .status(400)
            .json(apiErrorBody("until must be in the future", null));
        }
        until = dt;
      }

      const server = await prisma.discussionGroup.findUnique({
        where: { id: serverId },
        select: { ownerId: true },
      });
      if (server?.ownerId === targetUserId) {
        return res
          .status(400)
          .json(apiErrorBody("Cannot mute the server owner", null));
      }

      let auditChannelIdMute = null;
      const acRaw = req.body?.auditChannelId;
      if (acRaw != null && acRaw !== "") {
        const ac = Number(acRaw);
        if (Number.isInteger(ac) && ac > 0) {
          const ch = await prisma.discussionChannel.findUnique({
            where: { id: ac },
            select: { serverId: true },
          });
          if (ch && ch.serverId === serverId) auditChannelIdMute = ac;
        }
      }

      const priorMembership = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: serverId, userId: targetUserId, leftAt: null },
        select: { mutedUntil: true },
      });
      if (!priorMembership) {
        return res.status(404).json(apiErrorBody("Member not found", null));
      }

      await prisma.discussionGroupMembership.updateMany({
        where: { groupId: serverId, userId: targetUserId, leftAt: null },
        data: { mutedUntil: until },
      });
      try {
        const io = getIo();
        if (io) {
          io.to(`user:${targetUserId}`).emit("server:member:mute", {
            serverId,
            userId: targetUserId,
            mutedUntil: until ? until.toISOString() : null,
          });
        }
      } catch (emitErr) {
        console.warn("server:member:mute socket emit failed", emitErr?.message);
      }
      const actorMute = getDiscussionCallerUserId(req);
      if (actorMute) {
        await recordDiscussionAuditLog(prisma, {
          serverId,
          channelId: auditChannelIdMute,
          actorUserId: actorMute,
          action: until ? "MEMBER_MUTE" : "MEMBER_UNMUTE",
          targetType: "MEMBER",
          targetId: targetUserId,
          before: { mutedUntil: priorMembership.mutedUntil?.toISOString() ?? null },
          after: { mutedUntil: until ? until.toISOString() : null },
        });
      }
      return res.json({
        ok: true,
        mutedUntil: until ? until.toISOString() : null,
      });
    } catch (error) {
      console.error("POST /discussions/servers/:serverId/members/:userId/mute failed", error);
      return res.status(500).json(apiErrorBody("Failed to update mute", null));
    }
  },
);

router.delete(
  "/servers/:serverId/members/:targetUserId",
  requireServerPermission(PERMISSION_BITS.MODERATE_MEMBERS),
  async (req, res) => {
    try {
      const serverId = req.discussionServerId;
      const targetUserId = Number(req.params.targetUserId);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json(apiErrorBody("Invalid targetUserId", null));
      }
      let auditChannelIdKick = null;
      const qAc = req.query?.auditChannelId;
      if (qAc != null && qAc !== "") {
        const ac = Number(qAc);
        if (Number.isInteger(ac) && ac > 0) {
          const ch = await prisma.discussionChannel.findUnique({
            where: { id: ac },
            select: { serverId: true },
          });
          if (ch && ch.serverId === serverId) auditChannelIdKick = ac;
        }
      }
      // Refuse to kick the server owner — owners can only step down via a
      // separate transfer-ownership flow (not built yet).
      const server = await prisma.discussionGroup.findUnique({
        where: { id: serverId },
        select: { ownerId: true },
      });
      if (server?.ownerId === targetUserId) {
        return res
          .status(400)
          .json(apiErrorBody("Cannot remove the server owner", null));
      }
      const updated = await prisma.discussionGroupMembership.updateMany({
        where: { groupId: serverId, userId: targetUserId, leftAt: null },
        data: { leftAt: new Date(), isActive: false },
      });
      if (updated.count === 0) {
        return res.status(404).json(apiErrorBody("Member not found", null));
      }
      try {
        const io = getIo();
        if (io) {
          io.to(`user:${targetUserId}`).emit("server:member:remove", {
            serverId,
            userId: targetUserId,
          });
        }
      } catch (emitErr) {
        console.warn("server:member:remove socket emit failed", emitErr?.message);
      }
      const actorKick = getDiscussionCallerUserId(req);
      if (actorKick) {
        await recordDiscussionAuditLog(prisma, {
          serverId,
          channelId: auditChannelIdKick,
          actorUserId: actorKick,
          action: "MEMBER_KICK",
          targetType: "MEMBER",
          targetId: targetUserId,
          before: { active: true },
          after: { leftAt: new Date().toISOString() },
        });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error("DELETE /discussions/servers/:serverId/members failed", error);
      return res.status(500).json(apiErrorBody("Failed to remove member", null));
    }
  },
);

export default router;
