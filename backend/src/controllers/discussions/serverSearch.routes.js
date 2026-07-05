/**
 * Message search routes.
 *
 *   GET /servers/:serverId/search
 *   GET /channels/:channelId/search
 */

import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import {
  PERMISSION_BITS,
  computeChannelPermissionsForServer,
  hasPermission,
  requireChannelPermission,
  requireServerPermission,
} from "../../features/discussions/permissions.js";
import { resolveServerMessageSearchFilters } from "../../features/discussions/serverMessageSearch.js";
import { applyAnonymousSenderPolicy } from "../../features/discussions/discussionMessagePublic.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";

const router = express.Router();

router.get(
  "/servers/:serverId/search",
  requireServerPermission(PERMISSION_BITS.VIEW_CHANNEL),
  async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const serverId = req.discussionServerId;
      const q = String(req.query.q ?? "").trim();
      const hasAnyFilter = Boolean(
        req.query.from || req.query.has || req.query.before || req.query.after
      );
      // Allow filter-only searches (e.g. just `from:alice`). Otherwise require
      // at least 2 chars of free text.
      if (q.length < 2 && !hasAnyFilter) {
        return res.json({ results: [], hasMore: false });
      }
      const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));

      // Filter to channels the caller can READ_MESSAGE_HISTORY for. Reuses
      // the batched permission helper so this is one round trip regardless
      // of channel count.
      const { channels, perms } = await computeChannelPermissionsForServer({
        userId,
        serverId,
      });
      const visibleChannelIds = channels
        .filter((c) =>
          hasPermission(perms.get(c.id) ?? 0n, PERMISSION_BITS.READ_MESSAGE_HISTORY)
        )
        .map((c) => c.id);
      if (visibleChannelIds.length === 0) {
        return res.json({ results: [], hasMore: false, q });
      }

      const filtered = await resolveServerMessageSearchFilters({
        query: req.query,
        serverId,
      });
      if (filtered.empty) {
        return res.json({
          results: [],
          hasMore: false,
          q,
          filters: filtered.summary,
        });
      }

      const messages = await prisma.discussionMessage.findMany({
        where: {
          channelId: { in: visibleChannelIds },
          deletedAt: null,
          content: { contains: q, mode: "insensitive" },
          ...filtered.where,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        include: {
          sender: { select: { id: true, full_name: true } },
          attachments: true,
          channel: { select: { id: true, name: true, slug: true } },
        },
      });

      const channelMembership = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: serverId, userId, leftAt: null, isActive: true },
      });

      const enriched = messages.map((m) =>
        applyAnonymousSenderPolicy(m, userId, channelMembership)
      );
      return res.json({
        results: enriched,
        hasMore: messages.length >= limit,
        q,
        filters: filtered.summary,
      });
    } catch (error) {
      console.error("GET /discussions/servers/:serverId/search failed", error);
      return res.status(500).json(apiErrorBody("Failed to search server", null));
    }
  },
);

router.get(
  "/channels/:channelId/search",
  requireChannelPermission(PERMISSION_BITS.READ_MESSAGE_HISTORY),
  async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const channelId = req.discussionChannelId;
      const q = String(req.query.q ?? "").trim();
      const hasAnyFilter = Boolean(
        req.query.from || req.query.has || req.query.before || req.query.after
      );
      if (q.length < 2 && !hasAnyFilter) {
        return res.json({ results: [], hasMore: false });
      }
      const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));

      // Channel scope needs the serverId so the from: filter can resolve
      // member handles via the right membership table.
      const channelRow = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true, scopeType: true, scopeId: true },
      });
      const filtered = await resolveServerMessageSearchFilters({
        query: req.query,
        serverId: channelRow?.serverId ?? 0,
        channel: channelRow,
      });
      if (filtered.empty) {
        return res.json({
          results: [],
          hasMore: false,
          q,
          filters: filtered.summary,
        });
      }

      const messages = await prisma.discussionMessage.findMany({
        where: {
          channelId,
          deletedAt: null,
          content: { contains: q, mode: "insensitive" },
          ...filtered.where,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        include: {
          sender: { select: { id: true, full_name: true } },
          attachments: true,
        },
      });

      const channelMembership = await prisma.discussionGroupMembership.findFirst({
        where: {
          group: { channels: { some: { id: channelId } } },
          userId,
          leftAt: null,
          isActive: true,
        },
      });

      const enriched = messages.map((m) =>
        applyAnonymousSenderPolicy(m, userId, channelMembership)
      );
      return res.json({
        results: enriched,
        hasMore: messages.length >= limit,
        q,
        filters: filtered.summary,
      });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/search failed", error);
      return res.status(500).json(apiErrorBody("Failed to search messages", null));
    }
  },
);

export default router;
