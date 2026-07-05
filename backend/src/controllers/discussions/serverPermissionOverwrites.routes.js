/**
 * Channel permission overwrites (A7).
 *
 *   GET    /channels/:channelId/overwrites
 *   PUT    /channels/:channelId/overwrites/:targetType/:targetId   { allow?, deny? }
 *   DELETE /channels/:channelId/overwrites/:targetType/:targetId
 *
 * All three routes are gated by MANAGE_ROLES on the channel — the same bit
 * the UI uses to show/hide the Permissions tab. `allow` and `deny` are
 * persisted as 64-bit BigInts and transported as decimal strings so the
 * client never has to parse a number that exceeds JS's `Number.MAX_SAFE_INTEGER`.
 *
 * Effective permission semantics live in
 * `backend/src/features/discussions/permissions.js`. We don't recompute here
 * — every connected client invalidates its cache off the emitted
 * `channel:update`, which causes `GET /channels/:id` to re-derive
 * `myPermissions` on the next render.
 */

import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import {
  PERMISSION_ADMINISTRATOR,
  PERMISSION_BITS,
  requireChannelPermission,
} from "../../features/discussions/permissions.js";
import {
  parseOverwriteTargetType,
  parseOverwriteTargetId,
  safePermissionBigInt,
  overwriteRowToDto,
  overwriteUpsertSchema,
} from "../../features/discussions/permissionOverwriteUtils.js";
import { recordDiscussionAuditLog } from "../../features/discussions/auditLog.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";

const router = express.Router();

router.get(
  "/channels/:channelId/overwrites",
  requireChannelPermission(PERMISSION_BITS.MANAGE_ROLES),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const rows = await prisma.discussionPermissionOverwrite.findMany({
        where: { channelId },
        orderBy: [{ targetType: "asc" }, { id: "asc" }],
      });
      return res.json({ results: rows.map(overwriteRowToDto) });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/overwrites failed", error);
      return res
        .status(500)
        .json(apiErrorBody("Failed to list overwrites", null));
    }
  },
);

router.put(
  "/channels/:channelId/overwrites/:targetType/:targetId",
  requireChannelPermission(PERMISSION_BITS.MANAGE_ROLES),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const targetType = parseOverwriteTargetType(req.params.targetType);
      const targetId = parseOverwriteTargetId(req.params.targetId);
      if (!targetType) {
        return res
          .status(400)
          .json(apiErrorBody("targetType must be ROLE or MEMBER", null));
      }
      if (!targetId) {
        return res.status(400).json(apiErrorBody("Invalid targetId", null));
      }

      const parsed = overwriteUpsertSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res
          .status(400)
          .json(apiErrorBody("Invalid request body", parsed.error.issues));
      }
      let allow = safePermissionBigInt(parsed.data.allow ?? "0");
      let deny = safePermissionBigInt(parsed.data.deny ?? "0");
      if (allow === null || deny === null) {
        return res
          .status(400)
          .json(apiErrorBody("allow/deny must be decimal-string BigInts", null));
      }
      // ADMINISTRATOR has no meaning inside an overwrite — it's a server-level
      // short-circuit. Mask it off both sides so the engine never sees it.
      allow &= ~PERMISSION_ADMINISTRATOR;
      deny &= ~PERMISSION_ADMINISTRATOR;
      // A bit set in both `allow` and `deny` is incoherent. Allow wins per
      // Discord semantics, but normalize on write so the row stays clean.
      deny &= ~allow;

      // Resolve the channel + validate the target lives on the same server.
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { id: true, serverId: true, archivedAt: true },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
      if (channel.archivedAt) {
        return res.status(410).json(apiErrorBody("Channel is archived", null));
      }

      if (targetType === "ROLE") {
        const role = await prisma.discussionRole.findUnique({
          where: { id: targetId },
          select: { id: true, serverId: true },
        });
        if (!role || role.serverId !== channel.serverId) {
          return res
            .status(400)
            .json(apiErrorBody("Role does not belong to this server", null));
        }
      } else {
        const membership = await prisma.discussionGroupMembership.findFirst({
          where: {
            groupId: channel.serverId,
            userId: targetId,
            leftAt: null,
            isActive: true,
          },
          select: { id: true },
        });
        if (!membership) {
          return res
            .status(400)
            .json(apiErrorBody("Target is not an active member of this server", null));
        }
      }

      const prevOverwrite = await prisma.discussionPermissionOverwrite.findUnique({
        where: {
          channelId_targetType_targetId: { channelId, targetType, targetId },
        },
      });

      const row = await prisma.discussionPermissionOverwrite.upsert({
        where: {
          channelId_targetType_targetId: { channelId, targetType, targetId },
        },
        create: { channelId, targetType, targetId, allow, deny },
        update: { allow, deny },
      });

      try {
        const io = getIo();
        if (io) {
          // Same nudge as channel rename — open chat panes refetch the
          // channel + its derived `myPermissions`. Members who lose
          // VIEW_CHANNEL aren't in the channel room, so also fan out at the
          // group level so their sidebar relocates.
          io.to(`channel:${channelId}`).emit("channel:update", {
            channelId,
            overwrite: overwriteRowToDto(row),
          });
          io.to(`discussion:group:${channel.serverId}`).emit(
            "server:channelsChanged",
            { serverId: channel.serverId, channelId },
          );
        }
      } catch (emitErr) {
        console.warn("overwrite upsert socket emit failed", emitErr?.message);
      }

      const actorOw = getDiscussionCallerUserId(req);
      if (actorOw) {
        await recordDiscussionAuditLog(prisma, {
          serverId: channel.serverId,
          channelId,
          actorUserId: actorOw,
          action: "PERMISSION_OVERWRITE_UPSERT",
          targetType,
          targetId,
          before: prevOverwrite ? overwriteRowToDto(prevOverwrite) : null,
          after: overwriteRowToDto(row),
        });
      }

      return res.json({ overwrite: overwriteRowToDto(row) });
    } catch (error) {
      console.error("PUT /discussions/channels/:channelId/overwrites failed", error);
      return res.status(500).json(apiErrorBody("Failed to save overwrite", null));
    }
  },
);

router.delete(
  "/channels/:channelId/overwrites/:targetType/:targetId",
  requireChannelPermission(PERMISSION_BITS.MANAGE_ROLES),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const targetType = parseOverwriteTargetType(req.params.targetType);
      const targetId = parseOverwriteTargetId(req.params.targetId);
      if (!targetType) {
        return res
          .status(400)
          .json(apiErrorBody("targetType must be ROLE or MEMBER", null));
      }
      if (!targetId) {
        return res.status(400).json(apiErrorBody("Invalid targetId", null));
      }

      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { id: true, serverId: true, archivedAt: true },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
      if (channel.archivedAt) {
        return res.status(410).json(apiErrorBody("Channel is archived", null));
      }

      const prevDel = await prisma.discussionPermissionOverwrite.findUnique({
        where: {
          channelId_targetType_targetId: { channelId, targetType, targetId },
        },
      });

      // Idempotent delete: a missing row is still success. Prisma's
      // `deleteMany` returns a count instead of throwing on miss.
      await prisma.discussionPermissionOverwrite.deleteMany({
        where: { channelId, targetType, targetId },
      });

      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("channel:update", {
            channelId,
            overwriteRemoved: { channelId, targetType, targetId },
          });
          io.to(`discussion:group:${channel.serverId}`).emit(
            "server:channelsChanged",
            { serverId: channel.serverId, channelId },
          );
        }
      } catch (emitErr) {
        console.warn("overwrite delete socket emit failed", emitErr?.message);
      }

      const actorDel = getDiscussionCallerUserId(req);
      if (actorDel && prevDel) {
        await recordDiscussionAuditLog(prisma, {
          serverId: channel.serverId,
          channelId,
          actorUserId: actorDel,
          action: "PERMISSION_OVERWRITE_DELETE",
          targetType,
          targetId,
          before: overwriteRowToDto(prevDel),
          after: null,
        });
      }

      return res.json({ ok: true });
    } catch (error) {
      console.error("DELETE /discussions/channels/:channelId/overwrites failed", error);
      return res.status(500).json(apiErrorBody("Failed to delete overwrite", null));
    }
  },
);

export default router;
