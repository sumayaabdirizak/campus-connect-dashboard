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
} from "../../features/discussions/permissions.js";
import { getServerVisibleChannels } from "../../features/discussions/serverChannelAccess.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";
import { slugifyDiscussionChannelName } from "../../features/discussions/discussionChannelUtils.js";
import { createChannelSchema } from "../../features/discussions/validation/serverSchemas.js";
import serverChannelsRouter from "./serverChannels.routes.js";
import serverMembersRouter from "./serverMembers.routes.js";
import serverChannelFeedRouter from "./serverChannelFeed.routes.js";
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
            name: true,
            scopeType: true,
            scopeId: true,
            kind: true,
            iconUrl: true,
            description: true,
            defaultChannelId: true,
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
        id: m.group.id,
        name: m.group.name,
        scopeType: m.group.scopeType,
        scopeId: m.group.scopeId,
        kind: m.group.kind,
        iconUrl: m.group.iconUrl,
        description: m.group.description,
        defaultChannelId: m.group.defaultChannelId,
        ownerId: m.group.ownerId,
        e2eeEnabled: m.group.e2eeEnabled,
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

    const serverId = Number(req.params.serverId);
    if (!Number.isInteger(serverId) || serverId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid serverId", null));
    }

    const server = await prisma.discussionGroup.findFirst({
      where: { id: serverId, kind: { in: ["FACULTY_SERVER", "USER_SERVER"] } },
      select: {
        id: true,
        name: true,
        scopeType: true,
        scopeId: true,
        kind: true,
        iconUrl: true,
        description: true,
        defaultChannelId: true,
        ownerId: true,
        e2eeEnabled: true,
        e2eeCurrentKeyVersion: true,
        e2eeRotationRequired: true,
        status: true,
      },
    });
    if (!server) return res.status(404).json(apiErrorBody("Server not found", null));

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

    return res.json({
      server,
      categories,
      channels,
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

    const serverId = Number(req.params.serverId);
    if (!Number.isInteger(serverId) || serverId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid serverId", null));
    }
    const channels = await getServerVisibleChannels(serverId, userId);
    return res.json({ results: channels });
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
      const categoryId = Number(parsed.data.categoryId);
      if (Number.isInteger(categoryId) && categoryId > 0) {
        const category = await prisma.discussionChannelCategory.findUnique({
          where: { id: categoryId },
          select: { id: true, serverId: true },
        });
        if (!category || category.serverId !== serverId) {
          return res.status(400).json(apiErrorBody("categoryId does not belong to this server", null));
        }
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
        where: {
          serverId,
          ...(Number.isInteger(categoryId) && categoryId > 0
            ? { categoryId }
            : { categoryId: null }),
        },
        _max: { position: true },
      });
      const nextPosition = Number(maxPosRow?._max?.position ?? -1) + 1;

      const channel = await prisma.discussionChannel.create({
        data: {
          serverId,
          categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null,
          name,
          slug: finalSlug,
          topic,
          kind: "TEXT",
          isPrivate: false,
          position: nextPosition,
        },
      });
      return res.status(201).json({ channel });
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
