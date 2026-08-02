/**
 * Discord-style REST endpoints for the hybrid academic discussion module.
 *
 * Mounted at `/api/discussions` alongside the legacy `/groups/...` paths in
 * `discussions.js`. These endpoints expose servers, categories, channels, and
 * channel-scoped messages.
 *
 *   GET    /servers
 *   GET    /servers/:serverId
 *   GET    /servers/:serverId/channels
 *   POST   /servers/:serverId/channels
 *
 * Channel, member, feed, search, pin, overwrite, and message routes are
 * split into sub-routers mounted below.
 *
 * Authorization is delegated to the permission engine in `permissions.js`.
 */

import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import {
  PERMISSION_BITS,
  computeServerPermissions,
  hasPermission,
  requireServerPermission,
} from "../../services/discussions/permissions.js";
import { getServerVisibleChannels } from "../../services/discussions/serverChannelAccess.js";
import { getDiscussionCallerUserId } from "../../services/discussions/discussionCaller.js";
import { slugifyDiscussionChannelName } from "../../services/discussions/discussionChannelUtils.js";
import { createChannelSchema } from "../../validation/serverSchemas.js";
import { whereFromParam } from "../../services/discussions/publicIdResolution.js";
import { resolveServerRow, resolveCategoryRow, toServerDto, toCategoryDto, toChannelDto } from "../../controllers/discussions/serverShared.js";
import serverChannelsRouter from "../../controllers/discussions/serverChannels.routes.js";
import serverMembersRouter from "./serverMembers.routes.js";
import serverChannelFeedRouter from "../../controllers/discussions/serverChannelFeed.routes.js";
import serverSearchRouter from "./serverSearch.routes.js";
import serverChannelPinsRouter from "./serverChannelPins.routes.js";
import serverPermissionOverwritesRouter from "./serverPermissionOverwrites.routes.js";
import serverMessagesRouter from "./serverMessages.routes.js";

const router = express.Router();

router.get("/servers", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

    const memberships = await prisma.discussionGroupMembership.findMany({
      where: {
        userId,
        leftAt: null,
        isActive: true,
        group: { status: "ACTIVE", kind: "FACULTY_SERVER" },
      },
      select: {
        groupId: true,
        role: true,
        group: {
          select: {
            id: true,
            publicId: true,
            name: true,
            scopeType: true,
            scopeId: true,
            kind: true,
            iconUrl: true,
            description: true,
            defaultChannel: { select: { publicId: true } },
            ownerId: true,
            e2eeEnabled: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const seen = new Set();
    const servers = [];
    for (const m of memberships) {
      if (seen.has(m.groupId)) continue;
      seen.add(m.groupId);
      servers.push({
        ...toServerDto(m.group),
        myMembershipRole: m.role,
      });
    }

    return res.json({ results: servers });
  } catch (error) {
    console.error("GET /discussions/servers failed", error);
    return res.status(500).json(apiErrorBody("Failed to list servers", null));
  }
});

router.get("/servers/:serverId", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

    const where = whereFromParam(req.params.serverId);
    if (!where) {
      return res.status(400).json(apiErrorBody("Invalid serverId", null));
    }

    const server = await prisma.discussionGroup.findFirst({
      where: { ...where, kind: { in: ["FACULTY_SERVER", "USER_SERVER"] } },
      select: {
        id: true,
        publicId: true,
        name: true,
        scopeType: true,
        scopeId: true,
        kind: true,
        iconUrl: true,
        description: true,
        defaultChannel: { select: { publicId: true } },
        ownerId: true,
        e2eeEnabled: true,
        e2eeCurrentKeyVersion: true,
        e2eeRotationRequired: true,
        status: true,
      },
    });
    if (!server) return res.status(404).json(apiErrorBody("Server not found", null));
    const serverId = server.id;

    const perms = await computeServerPermissions({ userId, serverId });
    if (!hasPermission(perms, PERMISSION_BITS.VIEW_CHANNEL)) {
      const membership = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: serverId, userId, leftAt: null, isActive: true },
        select: { role: true },
      });
      if (!membership) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
    }

    const [categories, channels, roles] = await Promise.all([
      prisma.discussionChannelCategory.findMany({
        where: { serverId },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      }),
      getServerVisibleChannels(serverId, userId),
      prisma.discussionRole.findMany({
        where: { serverId },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      }),
    ]);

    const categoryPublicIdById = new Map(categories.map((c) => [c.id, c.publicId]));

    return res.json({
      server: toServerDto(server),
      categories: categories.map((c) => toCategoryDto(c, server.publicId)),
      channels: channels.map((c) => toChannelDto(c, server.publicId, categoryPublicIdById)),
      roles: roles.map((r) => ({ ...r, permissions: r.permissions.toString() })),
      myServerPermissions: perms.toString(),
    });
  } catch (error) {
    console.error("GET /discussions/servers/:serverId failed", error);
    return res.status(500).json(apiErrorBody("Failed to load server", null));
  }
});

router.get("/servers/:serverId/channels", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

    const serverRow = await resolveServerRow(req.params.serverId);
    if (!serverRow) {
      return res.status(400).json(apiErrorBody("Invalid serverId", null));
    }
    const channels = await getServerVisibleChannels(serverRow.id, userId);
    const categories = await prisma.discussionChannelCategory.findMany({
      where: { serverId: serverRow.id },
      select: { id: true, publicId: true },
    });
    const categoryPublicIdById = new Map(categories.map((c) => [c.id, c.publicId]));
    return res.json({
      results: channels.map((c) => toChannelDto(c, serverRow.publicId, categoryPublicIdById)),
    });
  } catch (error) {
    console.error("GET /discussions/servers/:serverId/channels failed", error);
    return res.status(500).json(apiErrorBody("Failed to list channels", null));
  }
});

router.post(
  "/servers/:serverId/channels",
  requireServerPermission(PERMISSION_BITS.MANAGE_CHANNEL),
  async (req, res) => {
    try {
      const serverId = req.discussionServerId;
      const parsed = createChannelSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
      }
      const name = parsed.data.name.trim();
      const topicRaw = parsed.data.topic;
      const topic =
        topicRaw === undefined || topicRaw === null ? null : String(topicRaw).trim().slice(0, 1024) || null;
      let categoryId = null;
      let categoryPublicId = null;
      if (parsed.data.categoryId != null) {
        const category = await resolveCategoryRow(parsed.data.categoryId);
        if (!category || category.serverId !== serverId) {
          return res.status(400).json(apiErrorBody("categoryId does not belong to this server", null));
        }
        categoryId = category.id;
        categoryPublicId = category.publicId;
      }

      const initialSlug = slugifyDiscussionChannelName(name);
      const existing = await prisma.discussionChannel.findMany({
        where: {
          serverId,
          slug: {
            startsWith: initialSlug,
          },
        },
        select: { slug: true },
      });
      const slugSet = new Set(existing.map((row) => row.slug));
      let finalSlug = initialSlug;
      let suffix = 2;
      while (slugSet.has(finalSlug)) {
        finalSlug = `${initialSlug}-${suffix}`;
        suffix += 1;
      }

      const maxPosRow = await prisma.discussionChannel.aggregate({
        where: { serverId, categoryId },
        _max: { position: true },
      });
      const nextPosition = Number(maxPosRow?._max?.position ?? -1) + 1;

      const channel = await prisma.discussionChannel.create({
        data: {
          serverId,
          categoryId,
          name,
          slug: finalSlug,
          topic,
          kind: "TEXT",
          isPrivate: false,
          position: nextPosition,
        },
      });
      const categoryMap = categoryId != null ? new Map([[categoryId, categoryPublicId]]) : null;
      return res
        .status(201)
        .json({ channel: toChannelDto(channel, req.discussionServerPublicId, categoryMap) });
    } catch (error) {
      console.error("POST /discussions/servers/:serverId/channels failed", error);
      return res.status(500).json(apiErrorBody("Failed to create channel", null));
    }
  },
);

router.use(serverChannelsRouter);
router.use(serverMembersRouter);
router.use(serverChannelFeedRouter);
router.use(serverSearchRouter);
router.use(serverChannelPinsRouter);
router.use(serverPermissionOverwritesRouter);
router.use(serverMessagesRouter);

export default router;
