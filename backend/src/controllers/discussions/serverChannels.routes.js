/**
 * Channel CRUD and lifecycle routes.
 *
 *   GET    /channels/:channelId
 *   GET    /channels/:channelId/audit-log  (?cursor= — VIEW_AUDIT_LOG)
 *   GET    /channels/:channelId/members
 *   PATCH  /channels/:channelId  (name, topic — requires MANAGE_CHANNEL; e.g. Dean)
 *   POST   /channels/:channelId/archive
 *   DELETE /channels/:channelId/archive
 *   DELETE /channels/:channelId  (hard delete — archived only; MANAGE_CHANNEL + MANAGE_SERVER)
 */

import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import {
  PERMISSION_BITS,
  computeServerPermissions,
  hasPermission,
  requireChannelPermission,
} from "../../features/discussions/permissions.js";
import {
  filterMembershipRowsByChannelScope,
} from "../../features/discussions/channelScopeAccess.js";
import { recordDiscussionAuditLog } from "../../features/discussions/auditLog.js";
import {
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../features/discussions/discussionPagination.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";
import { patchChannelSchema } from "../../features/discussions/validation/serverSchemas.js";

const router = express.Router();

const AUDIT_LOG_PAGE_SIZE = 50;

router.get("/channels/:channelId", requireChannelPermission(PERMISSION_BITS.VIEW_CHANNEL), async (req, res) => {
  try {
    const channelId = req.discussionChannelId;
    const channel = await prisma.discussionChannel.findUnique({
      where: { id: channelId },
      include: {
        category: true,
      },
    });
    if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
    return res.json({
      channel,
      myPermissions: req.discussionChannelPermissions.toString(),
    });
  } catch (error) {
    console.error("GET /discussions/channels/:channelId failed", error);
    return res.status(500).json(apiErrorBody("Failed to load channel", null));
  }
});

router.get(
  "/channels/:channelId/audit-log",
  requireChannelPermission(PERMISSION_BITS.VIEW_AUDIT_LOG),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const limit = Math.min(
        AUDIT_LOG_PAGE_SIZE,
        Math.max(1, Number(req.query.limit ?? AUDIT_LOG_PAGE_SIZE)),
      );
      const cursor = decodeDiscussionCursor(req.query.cursor);
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { id: true, serverId: true },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));

      const where = {
        channelId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      };

      const rows = await prisma.discussionAuditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        include: {
          actor: { select: { id: true, full_name: true } },
        },
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor =
        hasMore && page.length
          ? encodeDiscussionCursor(page[page.length - 1].createdAt, page[page.length - 1].id)
          : null;

      return res.json({
        results: page.map((r) => ({
          id: r.id,
          serverId: r.serverId,
          channelId: r.channelId,
          actorUserId: r.actorUserId,
          actor: r.actor,
          action: r.action,
          targetType: r.targetType,
          targetId: r.targetId,
          before: r.before,
          after: r.after,
          createdAt: r.createdAt.toISOString(),
        })),
        nextCursor,
        hasMore,
      });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/audit-log failed", error);
      return res.status(500).json(apiErrorBody("Failed to load audit log", null));
    }
  },
);

router.get(
  "/channels/:channelId/members",
  requireChannelPermission(PERMISSION_BITS.VIEW_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true, scopeType: true, scopeId: true },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));

      const memberRows = await prisma.discussionGroupMembership.findMany({
        where: { groupId: channel.serverId, leftAt: null, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              number: true,
              status: true,
              role: { select: { name: true } },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      });
      const rows = await filterMembershipRowsByChannelScope(memberRows, channel);
      const results = rows.map((r) => ({
        userId: r.userId,
        role: r.role,
        canPost: r.canPost,
        canModerate: r.canModerate,
        joinedAt: r.joinedAt,
        user: r.user
          ? {
              id: r.user.id,
              full_name: r.user.full_name,
              email: r.user.email,
              number: r.user.number,
              status: r.user.status,
              role: r.user.role?.name ?? null,
            }
          : null,
      }));
      return res.json({ results });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/members failed", error);
      return res.status(500).json(apiErrorBody("Failed to list channel members", null));
    }
  },
);

router.patch(
  "/channels/:channelId",
  requireChannelPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const parsed = patchChannelSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }
      let { name, topic, categoryId, position, kind, isPrivate, slowModeSeconds } = parsed.data;
      if (
        name === undefined &&
        topic === undefined &&
        categoryId === undefined &&
        position === undefined &&
        kind === undefined &&
        isPrivate === undefined &&
        slowModeSeconds === undefined
      ) {
        return res
          .status(400)
          .json(
            apiErrorBody(
              "Provide name, topic, categoryId, position, kind, isPrivate, or slowModeSeconds to update",
              null,
            ),
          );
      }
      if (topic !== undefined && topic !== null) {
        const t = String(topic).trim();
        if (t.length > 1024) {
          return res.status(400).json(apiErrorBody("topic exceeds 1024 characters", null));
        }
        topic = t === "" ? null : t;
      }

      const existing = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          serverId: true,
          categoryId: true,
          position: true,
          isDefault: true,
          archivedAt: true,
          name: true,
          topic: true,
          kind: true,
          isPrivate: true,
          slowModeSeconds: true,
          position: true,
        },
      });
      if (!existing) return res.status(404).json(apiErrorBody("Channel not found", null));
      if (existing.archivedAt) {
        return res.status(410).json(apiErrorBody("Channel is archived", null));
      }

      // The default channel is what `@everyone` lands in when they first open
      // the server. Privatizing it would silently lock the whole org out, so
      // require demoting it from default first.
      if (isPrivate === true && existing.isDefault) {
        return res
          .status(400)
          .json(
            apiErrorBody(
              "The default channel cannot be made private. Promote another channel to default first.",
              null,
            ),
          );
      }

      // Resolve the destination category and validate it lives on the same
      // server. `null` is allowed and means "move to Uncategorized".
      let nextCategoryId;
      if (categoryId !== undefined) {
        if (categoryId === null) {
          nextCategoryId = null;
        } else {
          const cat = await prisma.discussionChannelCategory.findUnique({
            where: { id: categoryId },
            select: { id: true, serverId: true },
          });
          if (!cat || cat.serverId !== existing.serverId) {
            return res
              .status(400)
              .json(apiErrorBody("categoryId does not belong to this server", null));
          }
          nextCategoryId = cat.id;
        }
      } else {
        nextCategoryId = existing.categoryId;
      }

      // Resolve the destination position. If the category changed and the
      // caller did not specify a position, append to the bottom of the
      // destination so the channel doesn't silently jump to the top.
      let nextPosition = position;
      const categoryChanged =
        categoryId !== undefined && nextCategoryId !== existing.categoryId;
      if (nextPosition === undefined && categoryChanged) {
        const last = await prisma.discussionChannel.findFirst({
          where: {
            serverId: existing.serverId,
            categoryId: nextCategoryId,
            archivedAt: null,
            id: { not: channelId },
          },
          orderBy: [{ position: "desc" }, { id: "desc" }],
          select: { position: true },
        });
        nextPosition = last ? last.position + 1 : 0;
      }

      const data = {};
      if (name !== undefined) data.name = name;
      if (topic !== undefined) data.topic = topic;
      if (categoryId !== undefined) data.categoryId = nextCategoryId;
      if (nextPosition !== undefined) data.position = nextPosition;
      if (kind !== undefined) data.kind = kind;
      if (isPrivate !== undefined) data.isPrivate = isPrivate;
      if (slowModeSeconds !== undefined) data.slowModeSeconds = slowModeSeconds;

      const channel = await prisma.discussionChannel.update({
        where: { id: channelId },
        data,
        include: { category: true },
      });

      try {
        const io = getIo();
        if (io) {
          // Channel-room subscribers (open chat panes) get the canonical
          // updated row…
          io.to(`channel:${channelId}`).emit("channel:update", {
            channelId,
            channel,
          });
          // …and the server room gets a lightweight nudge so sidebars can
          // refetch the channel list when a move, reorder, or visibility
          // change happens. `isPrivate` flips also belong here: users who
          // lose `VIEW_CHANNEL` aren't in the channel room, so they'd never
          // see the per-channel emit.
          if (
            categoryId !== undefined ||
            nextPosition !== undefined ||
            isPrivate !== undefined ||
            slowModeSeconds !== undefined
          ) {
            io.to(`discussion:group:${existing.serverId}`).emit(
              "server:channelsChanged",
              { serverId: existing.serverId, channelId },
            );
          }
        }
      } catch (emitErr) {
        console.warn("channel:update socket emit failed", emitErr?.message);
      }

      const actorUserIdPatch = getDiscussionCallerUserId(req);
      if (actorUserIdPatch) {
        const beforePayload = {};
        const afterPayload = {};
        if (name !== undefined) {
          beforePayload.name = existing.name;
          afterPayload.name = channel.name;
        }
        if (topic !== undefined) {
          beforePayload.topic = existing.topic;
          afterPayload.topic = channel.topic;
        }
        if (categoryId !== undefined) {
          beforePayload.categoryId = existing.categoryId;
          afterPayload.categoryId = channel.categoryId;
        }
        if (nextPosition !== undefined) {
          beforePayload.position = existing.position;
          afterPayload.position = channel.position;
        }
        if (kind !== undefined) {
          beforePayload.kind = existing.kind;
          afterPayload.kind = channel.kind;
        }
        if (isPrivate !== undefined) {
          beforePayload.isPrivate = existing.isPrivate;
          afterPayload.isPrivate = channel.isPrivate;
        }
        if (slowModeSeconds !== undefined) {
          beforePayload.slowModeSeconds = existing.slowModeSeconds;
          afterPayload.slowModeSeconds = channel.slowModeSeconds;
        }
        if (Object.keys(beforePayload).length > 0) {
          await recordDiscussionAuditLog(prisma, {
            serverId: existing.serverId,
            channelId,
            actorUserId: actorUserIdPatch,
            action: "CHANNEL_UPDATE",
            targetType: "CHANNEL",
            targetId: channelId,
            before: beforePayload,
            after: afterPayload,
          });
        }
      }

      return res.json({
        channel,
        myPermissions: req.discussionChannelPermissions.toString(),
      });
    } catch (error) {
      console.error("PATCH /discussions/channels/:channelId failed", error);
      return res.status(500).json(apiErrorBody("Failed to update channel", null));
    }
  },
);

/**
 * Archive / un-archive a channel. Distinct route from PATCH /channels/:id
 * so the rename/topic flow can stay simple and the archive flow can have
 * its own permission rule (still MANAGE_CHANNEL today, but separable).
 *
 *   POST /channels/:channelId/archive    body: {}             → archive
 *   DELETE /channels/:channelId/archive                       → un-archive
 */
router.post(
  "/channels/:channelId/archive",
  requireChannelPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const priorArch = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { archivedAt: true, serverId: true },
      });
      if (!priorArch) return res.status(404).json(apiErrorBody("Channel not found", null));

      const channel = await prisma.discussionChannel.update({
        where: { id: channelId },
        data: { archivedAt: new Date() },
        include: { category: true },
      });
      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("channel:update", { channelId, channel });
        }
      } catch (emitErr) {
        console.warn("channel:archive socket emit failed", emitErr?.message);
      }
      const actorA = getDiscussionCallerUserId(req);
      if (actorA) {
        await recordDiscussionAuditLog(prisma, {
          serverId: priorArch.serverId,
          channelId,
          actorUserId: actorA,
          action: "CHANNEL_ARCHIVE",
          targetType: "CHANNEL",
          targetId: channelId,
          before: { archivedAt: priorArch.archivedAt?.toISOString() ?? null },
          after: { archivedAt: channel.archivedAt?.toISOString() ?? null },
        });
      }
      return res.json({ channel });
    } catch (error) {
      console.error("POST /discussions/channels/:channelId/archive failed", error);
      return res.status(500).json(apiErrorBody("Failed to archive channel", null));
    }
  },
);

router.delete(
  "/channels/:channelId/archive",
  requireChannelPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const priorUn = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { archivedAt: true, serverId: true },
      });
      if (!priorUn) return res.status(404).json(apiErrorBody("Channel not found", null));

      const channel = await prisma.discussionChannel.update({
        where: { id: channelId },
        data: { archivedAt: null },
        include: { category: true },
      });
      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("channel:update", { channelId, channel });
        }
      } catch (emitErr) {
        console.warn("channel:unarchive socket emit failed", emitErr?.message);
      }
      const actorU = getDiscussionCallerUserId(req);
      if (actorU) {
        await recordDiscussionAuditLog(prisma, {
          serverId: priorUn.serverId,
          channelId,
          actorUserId: actorU,
          action: "CHANNEL_UNARCHIVE",
          targetType: "CHANNEL",
          targetId: channelId,
          before: { archivedAt: priorUn.archivedAt?.toISOString() ?? null },
          after: { archivedAt: channel.archivedAt?.toISOString() ?? null },
        });
      }
      return res.json({ channel });
    } catch (error) {
      console.error("DELETE /discussions/channels/:channelId/archive failed", error);
      return res.status(500).json(apiErrorBody("Failed to un-archive channel", null));
    }
  },
);

/**
 * Permanently delete an archived channel (A10). Messages and dependent rows
 * cascade via Prisma/DB FKs. Requires MANAGE_CHANNEL (middleware) plus
 * MANAGE_SERVER at the server level. Default channel returns 400.
 */
router.delete(
  "/channels/:channelId",
  requireChannelPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      const channelId = req.discussionChannelId;
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          serverId: true,
          archivedAt: true,
          isDefault: true,
          name: true,
          slug: true,
        },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));
      if (channel.isDefault) {
        return res.status(400).json(apiErrorBody("The default channel cannot be deleted", null));
      }
      if (!channel.archivedAt) {
        return res
          .status(400)
          .json(apiErrorBody("Archive the channel before you can delete it permanently", null));
      }

      const serverPerms = await computeServerPermissions({
        userId,
        serverId: channel.serverId,
      });
      if (!hasPermission(serverPerms, PERMISSION_BITS.MANAGE_SERVER)) {
        return res
          .status(403)
          .json(
            apiErrorBody(
              "You need Manage Server permission to permanently delete a channel",
              null,
            ),
          );
      }

      await recordDiscussionAuditLog(prisma, {
        serverId: channel.serverId,
        channelId,
        actorUserId: userId,
        action: "CHANNEL_HARD_DELETE",
        targetType: "CHANNEL",
        targetId: channelId,
        before: { name: channel.name, slug: channel.slug },
        after: null,
      });

      await prisma.discussionChannel.delete({ where: { id: channelId } });

      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("channel:update", {
            channelId,
            serverId: channel.serverId,
            deleted: true,
          });
          io.to(`discussion:group:${channel.serverId}`).emit("server:channelsChanged", {
            serverId: channel.serverId,
            channelId,
          });
        }
      } catch (emitErr) {
        console.warn("channel:hard-delete socket emit failed", emitErr?.message);
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("DELETE /discussions/channels/:channelId failed", error);
      return res.status(500).json(apiErrorBody("Failed to delete channel", null));
    }
  },
);

export default router;
