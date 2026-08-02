import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";
import { PERMISSION_BITS, requireChannelPermission } from "../../../../services/discussions/permissions.js";
import {
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../../../services/discussions/discussionPagination.js";
import { AUDIT_LOG_PAGE_SIZE } from "../shared.js";

const router = express.Router();

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
        include: { actor: { select: { id: true, full_name: true } } },
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

export default router;
