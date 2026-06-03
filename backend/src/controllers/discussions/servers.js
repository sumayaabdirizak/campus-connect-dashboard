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
 *   GET    /channels/:channelId
 *   GET    /channels/:channelId/audit-log  (?cursor= — VIEW_AUDIT_LOG)
 *   PATCH  /channels/:channelId  (name, topic — requires MANAGE_CHANNEL; e.g. Dean)
 *   GET    /channels/:channelId/messages  (?threadRoot=messageId for thread slice)
 *   GET    /channels/:channelId/pins
 *   POST   /channels/:channelId/pins
 *   DELETE /channels/:channelId/pins/:messageId
 *   DELETE /channels/:channelId  (hard delete — archived only; MANAGE_CHANNEL + MANAGE_SERVER)
 *   POST   /channels/:channelId/messages
 *   GET    /messages/:messageId/reactions
 *   POST   /messages/:messageId/reactions
 *   DELETE /messages/:messageId/reactions/:emoji  (URL-encoded emoji; preferred)
 *   DELETE /messages/:messageId/reactions          (body: { emoji } — legacy)
 *   PATCH  /messages/:messageId
 *   DELETE /messages/:messageId
 *
 * Authorization is delegated to the permission engine in `permissions.js`.
 */

import crypto from "crypto";
import express from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody, prismaSchemaDriftHint } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import {
  PERMISSION_ADMINISTRATOR,
  PERMISSION_BITS,
  computeChannelPermissions,
  computeChannelPermissionsForServer,
  computeServerPermissions,
  hasPermission,
  requireChannelPermission,
  requireServerPermission,
} from "../../features/discussions/permissions.js";
import { userMayAccessDiscussionChannelScope } from "../../features/discussions/channelScopeAccess.js";
import { assertMessageReactionAllowed } from "../../features/discussions/messageAccess.js";
import { extractMentionHandles, resolveMentionUserIds } from "../../features/discussions/mentionResolution.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
  deriveQuestionFields,
} from "../../features/discussions/discussionMessagePublic.js";
import { recordDiscussionAuditLog } from "../../features/discussions/auditLog.js";
import { getSigningSecret } from "../../utils/signingSecret.js";

const router = express.Router();

const reactionBodySchema = z.object({
  emoji: z.string().trim().min(1).max(64),
});

const MAX_HISTORY_LIMIT = 100;
const AUDIT_LOG_PAGE_SIZE = 50;

const sendChannelMessageSchema = z.object({
  content: z.string().trim().max(20000).optional().nullable(),
  messageType: z.enum(["TEXT", "MEDIA", "SYSTEM", "QUESTION"]).default("TEXT"),
  postAsQuestion: z.boolean().optional().default(false),
  isAnonymous: z.boolean().optional().default(false),
  attachmentIds: z.array(z.number().int().positive()).default([]),
  parentMessageId: z.number().int().positive().optional().nullable(),
  e2e: z
    .object({
      ciphertext: z.string().min(1),
      nonce: z.string().min(1),
      keyVersion: z.number().int().positive(),
      senderDeviceId: z.string().min(1).max(128),
    })
    .optional(),
});

const editMessageSchema = z.object({
  content: z.string().trim().max(20000).optional().nullable(),
});

const patchChannelSchema = z
  .object({
    name: z.string().trim().min(1).max(191).optional(),
    topic: z.union([z.string(), z.null()]).optional(),
    // `null` moves the channel to "Uncategorized". Validated below to ensure
    // the category lives on the same server.
    categoryId: z.union([z.number().int().positive(), z.null()]).optional(),
    // Discord-style sort index within the category. The list endpoints already
    // `orderBy: [{ position: "asc" }, { id: "asc" }]`, so writing this column
    // is sufficient to reorder.
    position: z.number().int().min(0).max(10000).optional(),
    // Must mirror the `DiscussionChannelKind` enum in `schema.prisma`.
    kind: z.enum(["TEXT", "ANNOUNCEMENT", "FORUM"]).optional(),
    // Private channels are gated by explicit role/member ALLOW overwrites only.
    // Default channels are protected below (a private default channel would
    // lock @everyone out of the server).
    isPrivate: z.boolean().optional(),
    // Minimum seconds between messages from the same user in this channel (0 = off).
    slowModeSeconds: z.number().int().min(0).max(21600).optional(),
  })
  .strict();

const createChannelSchema = z
  .object({
    name: z.string().trim().min(1).max(191),
    topic: z.union([z.string(), z.null()]).optional(),
    categoryId: z.number().int().positive().optional(),
  })
  .strict();

function parseLimit(input) {
  const n = Number(input ?? 50);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(n, MAX_HISTORY_LIMIT);
}

function encodeCursor(createdAt, id) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
    if (!parsed?.createdAt || !Number.isFinite(Number(parsed?.id))) return null;
    const dt = new Date(parsed.createdAt);
    if (Number.isNaN(dt.getTime())) return null;
    return { createdAt: dt, id: Number(parsed.id) };
  } catch {
    return null;
  }
}

function getCallerUserId(req) {
  return Number(req.user?.id ?? req.user?.sub) || null;
}

function slugifyChannelName(name) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return base || `channel-${Date.now().toString(36)}`;
}

const ATTACHMENT_SIGNING_SECRET = getSigningSecret("DISCUSSION_ATTACHMENT_SIGNING_SECRET");
const ATTACHMENT_URL_TTL_SECONDS = Number(process.env.DISCUSSION_ATTACHMENT_URL_TTL_SECONDS || 900);

function buildAttachmentAccessUrl(req, attachmentId, userId) {
  const expiresAt = Date.now() + Math.max(60, ATTACHMENT_URL_TTL_SECONDS) * 1000;
  const payload = `${Number(attachmentId)}.${Number(userId)}.${Number(expiresAt)}`;
  const sig = crypto.createHmac("sha256", ATTACHMENT_SIGNING_SECRET).update(payload).digest("hex");
  const token = Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
  return `${req.protocol}://${req.get("host")}/api/discussions/attachments/${attachmentId}/download?token=${token}`;
}

/** Adds signed accessUrl + isE2EE on each attachment for channel API responses. */
function enrichMessagesAttachments(req, messages, userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return messages;
  return messages.map((m) => ({
    ...m,
    attachments: (m.attachments ?? []).map((a) => ({
      ...a,
      size: Number(a.size),
      accessUrl: buildAttachmentAccessUrl(req, a.id, uid),
      isE2EE: Boolean(a.ciphertextHash != null || a.keyVersion != null),
    })),
  }));
}

function mapChannelMessagesForViewer(messages, userId, membership) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return messages;
  return messages.map((m) => applyAnonymousSenderPolicy(m, uid, membership));
}

async function getServerVisibleChannels(serverId, userId) {
  // Batched perms — issues O(1) queries instead of O(N×6) by hoisting the
  // user / system-roles / membership / overwrites round trips out of the loop.
  const { channels, perms } = await computeChannelPermissionsForServer({
    userId,
    serverId,
  });
  const visible = [];
  for (const channel of channels) {
    const p = perms.get(channel.id) ?? 0n;
    if (hasPermission(p, PERMISSION_BITS.VIEW_CHANNEL)) {
      visible.push({ ...channel, myPermissions: p.toString() });
    }
  }
  return visible;
}

async function filterMembershipRowsByChannelScope(rows, channel) {
  if (!channel?.scopeType || channel?.scopeId == null || rows.length === 0) return rows;
  const checks = await Promise.all(
    rows.map(async (row) => {
      const allowed = await userMayAccessDiscussionChannelScope({
        userId: row.userId,
        scopeType: channel.scopeType,
        scopeId: channel.scopeId,
        prismaClient: prisma,
      });
      return allowed ? row : null;
    })
  );
  return checks.filter(Boolean);
}

router.get("/servers", async (req, res) => {
  try {
    const userId = getCallerUserId(req);
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
    const userId = getCallerUserId(req);
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
    const userId = getCallerUserId(req);
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

      const initialSlug = slugifyChannelName(name);
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
      const cursor = decodeCursor(req.query.cursor);
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
          ? encodeCursor(page[page.length - 1].createdAt, page[page.length - 1].id)
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
      const userId = getCallerUserId(req);
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

      const actorUserIdPatch = getCallerUserId(req);
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

const OVERWRITE_TARGET_TYPES = Object.freeze({ ROLE: "ROLE", MEMBER: "MEMBER" });

const overwriteUpsertSchema = z
  .object({
    // Decimal-string BigInts. Empty / missing fields default to "0" so the
    // caller can clear one side without sending the other.
    allow: z
      .string()
      .regex(/^\d+$/, "allow must be a non-negative decimal string")
      .max(40)
      .optional(),
    deny: z
      .string()
      .regex(/^\d+$/, "deny must be a non-negative decimal string")
      .max(40)
      .optional(),
  })
  .strict();

function parseOverwriteTargetType(raw) {
  const key = String(raw || "").toUpperCase();
  return OVERWRITE_TARGET_TYPES[key] || null;
}

function parseTargetId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function safeBigInt(input) {
  if (input === undefined || input === null) return null;
  try {
    return BigInt(input);
  } catch {
    return null;
  }
}

function overwriteRowToDto(row) {
  return {
    id: row.id,
    channelId: row.channelId,
    targetType: row.targetType,
    targetId: row.targetId,
    allow: row.allow.toString(),
    deny: row.deny.toString(),
  };
}

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
      const targetId = parseTargetId(req.params.targetId);
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
      let allow = safeBigInt(parsed.data.allow ?? "0");
      let deny = safeBigInt(parsed.data.deny ?? "0");
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

      const actorOw = getCallerUserId(req);
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
      const targetId = parseTargetId(req.params.targetId);
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

      const actorDel = getCallerUserId(req);
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
      const actorA = getCallerUserId(req);
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
      const actorU = getCallerUserId(req);
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
      const userId = getCallerUserId(req);
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
      const actorMute = getCallerUserId(req);
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
      const actorKick = getCallerUserId(req);
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

router.get(
  "/channels/:channelId/messages",
  requireChannelPermission(PERMISSION_BITS.READ_MESSAGE_HISTORY),
  async (req, res) => {
    try {
      const userId = getCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const channelId = req.discussionChannelId;
      const channelForMember = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true },
      });
      const channelMembership = channelForMember
        ? await prisma.discussionGroupMembership.findFirst({
            where: {
              groupId: channelForMember.serverId,
              userId,
              leftAt: null,
              isActive: true,
            },
          })
        : null;
      const limit = parseLimit(req.query.limit);
      const cursor = decodeCursor(req.query.cursor);
      const threadRootRaw =
        req.query.threadRoot != null
          ? Number(req.query.threadRoot)
          : req.query.parentId != null
            ? Number(req.query.parentId)
            : null;
      const threadRoot =
        Number.isInteger(threadRootRaw) && threadRootRaw > 0 ? threadRootRaw : null;

      const msgInclude = {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
        reactions: { include: { user: { select: { id: true, full_name: true } } } },
      };

      /** Thread slice: root + replies (cursor loads older replies before the window). */
      if (threadRoot) {
        const root = await prisma.discussionMessage.findFirst({
          where: { id: threadRoot, channelId, deletedAt: null },
          include: msgInclude,
        });
        if (!root) {
          return res.json({
            results: [],
            nextCursor: null,
            hasMore: false,
            threadRoot,
          });
        }
        const whereReplies = {
          channelId,
          deletedAt: null,
          parentMessageId: threadRoot,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        };
        const replies = await prisma.discussionMessage.findMany({
          where: whereReplies,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
          include: msgInclude,
        });
        const hasMore = replies.length > limit;
        const slice = hasMore ? replies.slice(0, limit) : replies;
        const nextCursor =
          hasMore && slice.length > 0
            ? encodeCursor(slice[slice.length - 1].createdAt, slice[slice.length - 1].id)
            : null;
        const repliesAsc = slice.slice().reverse();
        const combined = cursor ? repliesAsc : [root, ...repliesAsc];
        return res.json({
          results: mapChannelMessagesForViewer(
            enrichMessagesAttachments(req, combined, userId),
            userId,
            channelMembership
          ),
          nextCursor,
          hasMore,
          threadRoot,
        });
      }

      const baseWhere = {
        channelId,
        deletedAt: null,
        parentMessageId: null,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      };

      const messages = await prisma.discussionMessage.findMany({
        where: baseWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        include: msgInclude,
      });

      const hasMore = messages.length > limit;
      const pageRows = hasMore ? messages.slice(0, limit) : messages;
      const nextCursor =
        hasMore && pageRows.length
          ? encodeCursor(pageRows[pageRows.length - 1].createdAt, pageRows[pageRows.length - 1].id)
          : null;

      let resultsPayload = pageRows.slice().reverse();
      if (resultsPayload.length > 0) {
        const rootIds = resultsPayload.map((m) => m.id);
        const [countRows, recentReplies] = await Promise.all([
          prisma.discussionMessage.groupBy({
            by: ["parentMessageId"],
            where: { channelId, deletedAt: null, parentMessageId: { in: rootIds } },
            _count: { id: true },
          }),
          prisma.discussionMessage.findMany({
            where: { channelId, deletedAt: null, parentMessageId: { in: rootIds } },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 400,
            select: {
              parentMessageId: true,
              createdAt: true,
              senderId: true,
              isAnonymous: true,
              sender: { select: { id: true, full_name: true } },
            },
          }),
        ]);
        const previewByRoot = new Map();
        for (const row of countRows) {
          previewByRoot.set(row.parentMessageId, {
            replyCount: row._count.id,
            lastReplyAt: null,
            previewSenders: [],
          });
        }
        for (const r of recentReplies) {
          const pid = r.parentMessageId;
          if (pid == null) continue;
          const pr = previewByRoot.get(pid);
          if (!pr) continue;
          if (!pr.lastReplyAt) pr.lastReplyAt = r.createdAt.toISOString();
          if (pr.previewSenders.length < 3 && (r.senderId || r.isAnonymous)) {
            const sid = r.isAnonymous ? 0 : Number(r.senderId);
            const name = r.isAnonymous ? "Anonymous" : r.sender?.full_name ?? "Member";
            if (!pr.previewSenders.some((s) => s.id === sid && s.full_name === name)) {
              pr.previewSenders.push({
                id: sid,
                full_name: name,
              });
            }
          }
        }
        resultsPayload = resultsPayload.map((m) => ({
          ...m,
          threadPreview: previewByRoot.get(m.id) ?? null,
        }));
      }

      return res.json({
        results: mapChannelMessagesForViewer(
          enrichMessagesAttachments(req, resultsPayload, userId),
          userId,
          channelMembership
        ),
        nextCursor,
        hasMore,
        threadRoot: null,
      });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/messages failed", error);
      const hint = prismaSchemaDriftHint(error);
      return res.status(500).json(apiErrorBody(`Failed to load messages.${hint}`, null));
    }
  },
);

/**
 * Resolves search-filter query params into a Prisma `where` fragment + a
 * canonical filter summary echoed back to the client (lets the frontend
 * render confirmation chips without re-parsing).
 *
 * Supported filters:
 *   from=<firstname>          → senderId where first-name token matches
 *                                (resolves against same membership rows the
 *                                mention engine uses)
 *   has=image|file|attachment → message has an attachment of that type
 *   before=<ISO>              → createdAt < date
 *   after=<ISO>               → createdAt >= date
 */
async function resolveSearchFilters({
  query,
  serverId,
  channelId,
  prismaClient = prisma,
}) {
  const where = {};
  const summary = {};

  // from:<firstname>
  const fromRaw = typeof query.from === "string" ? query.from.trim() : "";
  if (fromRaw) {
    summary.from = fromRaw;
    // Resolve by joining server membership and matching first-name (lower).
    const handle = fromRaw.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (handle) {
      const memberRows = await prismaClient.discussionGroupMembership.findMany({
        where: { groupId: Number(serverId), leftAt: null, isActive: true },
        select: {
          userId: true,
          user: { select: { full_name: true, number: true } },
        },
      });
      const ids = memberRows
        .filter((m) => {
          const num = String(m.user?.number || "").toLowerCase();
          if (num && num === handle) return true;
          const first = String(m.user?.full_name || "")
            .trim()
            .split(/\s+/)[0]
            ?.replace(/[^\w]/g, "")
            .toLowerCase();
          return first && first === handle;
        })
        .map((m) => Number(m.userId));
      if (ids.length === 0) {
        // No matching member → return a where that yields nothing.
        return { where: { id: -1 }, summary, empty: true };
      }
      where.senderId = { in: ids };
    }
  }

  // has=image|file|attachment
  const hasRaw = typeof query.has === "string" ? query.has.trim().toLowerCase() : "";
  if (hasRaw === "image" || hasRaw === "video" || hasRaw === "file") {
    summary.has = hasRaw;
    const fileType = hasRaw === "file" ? { not: "IMAGE" } : hasRaw.toUpperCase();
    where.attachments = { some: { fileType: hasRaw === "file" ? { in: ["FILE", "VIDEO"] } : hasRaw.toUpperCase() } };
  } else if (hasRaw === "attachment") {
    summary.has = "attachment";
    where.attachments = { some: {} };
  }

  // before / after
  const beforeRaw = typeof query.before === "string" ? query.before : "";
  if (beforeRaw) {
    const d = new Date(beforeRaw);
    if (!Number.isNaN(d.getTime())) {
      summary.before = d.toISOString();
      where.createdAt = { ...(where.createdAt ?? {}), lt: d };
    }
  }
  const afterRaw = typeof query.after === "string" ? query.after : "";
  if (afterRaw) {
    const d = new Date(afterRaw);
    if (!Number.isNaN(d.getTime())) {
      summary.after = d.toISOString();
      where.createdAt = { ...(where.createdAt ?? {}), gte: d };
    }
  }

  void channelId;
  return { where, summary, empty: false };
}

router.get(
  "/servers/:serverId/search",
  requireServerPermission(PERMISSION_BITS.VIEW_CHANNEL),
  async (req, res) => {
    try {
      const userId = getCallerUserId(req);
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

      const filtered = await resolveSearchFilters({
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
      const userId = getCallerUserId(req);
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
        select: { serverId: true },
      });
      const filtered = await resolveSearchFilters({
        query: req.query,
        serverId: channelRow?.serverId ?? 0,
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
      const userId = getCallerUserId(req);
      const channelId = req.discussionChannelId;
      const messageId = Number(req.body?.messageId);
      if (!Number.isInteger(messageId) || messageId <= 0) {
        return res.status(400).json(apiErrorBody("messageId is required", null));
      }
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true, slug: true, name: true },
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
      const pinMembers = await prisma.discussionGroupMembership.findMany({
        where: {
          groupId: channel.serverId,
          leftAt: null,
          isActive: true,
          userId: { not: userId },
        },
        select: { userId: true },
      });
      if (pinMembers.length > 0) {
        const pinner = await prisma.user.findUnique({
          where: { id: userId },
          select: { full_name: true },
        });
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
              pinnedByName: pinner?.full_name ?? pin.pinnedBy?.full_name ?? null,
            },
          })),
        });
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
      const userId = getCallerUserId(req);
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

router.post(
  "/channels/:channelId/messages",
  requireChannelPermission(PERMISSION_BITS.SEND_MESSAGES),
  async (req, res) => {
    try {
      const userId = getCallerUserId(req);
      const channelId = req.discussionChannelId;
      const parseResult = sendChannelMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parseResult.error.issues));
      }
      const body = parseResult.data;

      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          serverId: true,
          scopeType: true,
          scopeId: true,
          slowModeSeconds: true,
          server: { select: { id: true, e2eeEnabled: true } },
        },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));

      const channelMembership = await prisma.discussionGroupMembership.findFirst({
        where: {
          groupId: channel.serverId,
          userId,
          leftAt: null,
          isActive: true,
        },
      });

      // Moderator-applied mute. The send-message handler is the authoritative
      // enforcement point so we don't need to extend the permission engine
      // (which would have to fetch the membership row on every check).
      if (channelMembership?.mutedUntil) {
        const until = new Date(channelMembership.mutedUntil);
        if (!Number.isNaN(until.getTime()) && until.getTime() > Date.now()) {
          return res.status(403).json(
            apiErrorBody("You are muted in this server", {
              code: "MEMBER_MUTED",
              mutedUntil: until.toISOString(),
            })
          );
        }
      }

      if (body.parentMessageId != null) {
        const parent = await prisma.discussionMessage.findFirst({
          where: {
            id: body.parentMessageId,
            channelId,
            deletedAt: null,
            parentMessageId: null,
          },
          select: { id: true },
        });
        if (!parent) {
          return res
            .status(400)
            .json(apiErrorBody("parentMessageId must be a root message in this channel", null));
        }
      }

      const isEncrypted = !!body.e2e;
      const parentMessageId = body.parentMessageId ?? null;
      const attachmentIds = body.attachmentIds ?? [];

      let effectiveContent = "";
      let messageType = "TEXT";
      let isAnonymousFlag = false;

      if (isEncrypted) {
        effectiveContent = String(body.content ?? "").trim();
        const hasTextEnc = effectiveContent.length > 0;
        messageType =
          attachmentIds.length > 0 && !hasTextEnc ? "MEDIA" : String(body.messageType || "TEXT").toUpperCase();
        isAnonymousFlag = false;
      } else {
        const derived = deriveQuestionFields({
          content: body.content ?? "",
          messageType: body.messageType,
          postAsQuestion: body.postAsQuestion,
          isAnonymous: body.isAnonymous,
          parentMessageId,
        });
        effectiveContent = derived.contentStored.trim();
        const hasTextBody = effectiveContent.length > 0;
        messageType =
          attachmentIds.length > 0 && !hasTextBody ? "MEDIA" : derived.messageType;
        isAnonymousFlag = derived.isAnonymous;
        if (messageType !== "QUESTION") isAnonymousFlag = false;
        if (messageType === "QUESTION" && !hasTextBody) {
          return res.status(400).json(apiErrorBody("Question text is required", null));
        }
      }

      const hasText = effectiveContent.length > 0;
      if (!isEncrypted && !hasText && attachmentIds.length === 0) {
        return res
          .status(400)
          .json(apiErrorBody("Either content or attachmentIds is required", null));
      }
      if (isEncrypted && !hasText && attachmentIds.length === 0) {
        return res
          .status(400)
          .json(apiErrorBody("Either content or attachmentIds is required", null));
      }
      if (attachmentIds.length > 0) {
        const pendingRows = await prisma.discussionAttachment.findMany({
          where: {
            id: { in: attachmentIds },
            uploadedById: userId,
            status: "PENDING",
            messageId: null,
            OR: [{ groupId: channel.serverId }, { groupId: null }],
          },
        });
        if (pendingRows.length !== attachmentIds.length) {
          return res
            .status(400)
            .json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
        }
      }

      const slowModeSec = Math.max(0, Math.floor(Number(channel.slowModeSeconds ?? 0)) || 0);
      if (slowModeSec > 0) {
        const canBypassSlow = hasPermission(
          req.discussionChannelPermissions,
          PERMISSION_BITS.MANAGE_MESSAGES,
        );
        if (!canBypassSlow) {
          const lastFromSender = await prisma.discussionMessage.findFirst({
            where: {
              channelId,
              senderId: userId,
              deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          });
          if (lastFromSender) {
            const elapsedSec = (Date.now() - lastFromSender.createdAt.getTime()) / 1000;
            if (elapsedSec < slowModeSec) {
              const retryAfterSeconds = Math.max(1, Math.ceil(slowModeSec - elapsedSec));
              return res.status(429).json({
                status: "error",
                message: `Slow mode is enabled. Try again in ${retryAfterSeconds}s.`,
                code: "SLOW_MODE",
                retryAfterSeconds,
              });
            }
          }
        }
      }

      const message = await prisma.$transaction(async (tx) => {
        const created = await tx.discussionMessage.create({
          data: {
            groupId: channel.serverId,
            channelId,
            senderId: userId,
            content: isEncrypted ? null : hasText ? effectiveContent : null,
            messageType,
            isAnonymous: isAnonymousFlag,
            parentMessageId: body.parentMessageId ?? null,
            keyVersion: body.e2e?.keyVersion ?? null,
            nonce: body.e2e?.nonce ?? null,
            ciphertext: body.e2e?.ciphertext ?? null,
            senderDeviceId: body.e2e?.senderDeviceId ?? null,
          },
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        });

        if (attachmentIds.length > 0) {
          await tx.discussionAttachment.updateMany({
            where: { id: { in: attachmentIds }, uploadedById: userId, messageId: null },
            data: {
              messageId: created.id,
              groupId: channel.serverId,
              status: "LINKED",
            },
          });
        }

        const allRecipientRows = await tx.discussionGroupMembership.findMany({
          where: {
            groupId: channel.serverId,
            leftAt: null,
            isActive: true,
            userId: { not: userId },
          },
          select: {
            userId: true,
            user: { select: { number: true, full_name: true } },
          },
        });
        const recipientRows = await filterMembershipRowsByChannelScope(allRecipientRows, channel);
        const memberRows = recipientRows.map((r) => ({
          userId: r.userId,
          number: r.user?.number ?? "",
          full_name: r.user?.full_name ?? "",
        }));
        const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));
        const recipientIds = recipientRows.map((r) => Number(r.userId)).filter(Boolean);
        const plaintext = isEncrypted ? "" : hasText ? effectiveContent : "";
        const handles = extractMentionHandles(plaintext);
        const mentionUserIds = new Set(
          resolveMentionUserIds(handles, memberRows, userId).filter((id) => memberIdSet.has(id))
        );
        const messageRecipients = recipientIds.filter((rid) => !mentionUserIds.has(rid));
        if (messageRecipients.length > 0) {
          await tx.discussionNotification.createMany({
            data: messageRecipients.map((uid) => ({
              userId: uid,
              groupId: channel.serverId,
              messageId: created.id,
              type: "MESSAGE",
              payload: {
                groupId: channel.serverId,
                channelId,
                messageId: created.id,
                senderId: userId,
                senderName: anonymousSafeSenderName({
                  isAnonymous: isAnonymousFlag,
                  sender: created.sender,
                }),
              },
            })),
          });
        }
        if (mentionUserIds.size > 0) {
          await tx.discussionNotification.createMany({
            data: [...mentionUserIds].map((recipientId) => ({
              userId: recipientId,
              groupId: channel.serverId,
              messageId: created.id,
              type: "MENTION",
              payload: {
                groupId: channel.serverId,
                channelId,
                messageId: created.id,
                senderId: userId,
                senderName: anonymousSafeSenderName({
                  isAnonymous: isAnonymousFlag,
                  sender: created.sender,
                }),
              },
            })),
          });
        }

        return tx.discussionMessage.findUnique({
          where: { id: created.id },
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        });
      });

      if (!message) {
        return res.status(500).json(apiErrorBody("Failed to create message", null));
      }

      const rawOut = enrichMessagesAttachments(
        req,
        [{ ...message, channelId, serverId: channel.serverId }],
        userId
      )[0];
      const outPayload = applyAnonymousSenderPolicy(rawOut, userId, channelMembership);
      const wsPayload = rawOut.isAnonymous
        ? applyAnonymousSenderPolicy(rawOut, null, null, { broadcast: true })
        : rawOut;
      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("message:new", wsPayload);
          io.to(`channel:${channelId}`).emit("discussion:message:new", wsPayload);
        }
      } catch (emitErr) {
        console.warn("Socket emit failed for channel message:new", emitErr?.message);
      }

      return res.status(201).json({ message: outPayload });
    } catch (error) {
      console.error("POST /discussions/channels/:channelId/messages failed", error);
      return res.status(500).json(apiErrorBody("Failed to send message", null));
    }
  },
);

router.patch("/messages/:messageId", async (req, res) => {
  try {
    const userId = getCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    const parseResult = editMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parseResult.error.issues));
    }
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!message) return res.status(404).json(apiErrorBody("Message not found", null));
    if (message.deletedAt) {
      return res.status(410).json(apiErrorBody("Message deleted", null));
    }
    if (message.senderId !== userId) {
      return res.status(403).json(apiErrorBody("Cannot edit other users' messages", null));
    }

    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: { content: parseResult.data.content ?? null, editedAt: new Date() },
    });

    try {
      const io = getIo();
      if (io && message.channelId) {
        io.to(`channel:${message.channelId}`).emit("message:edit", { message: updated });
      }
    } catch (emitErr) {
      console.warn("Socket emit failed for message:edit", emitErr?.message);
    }
    return res.json({ message: updated });
  } catch (error) {
    console.error("PATCH /discussions/messages/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to edit message", null));
  }
});

router.delete("/messages/:messageId", async (req, res) => {
  try {
    const userId = getCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, channelId: true, deletedAt: true },
    });
    if (!message) return res.status(404).json(apiErrorBody("Message not found", null));
    if (message.deletedAt) return res.json({ message });

    const isAuthor = message.senderId === userId;
    if (!isAuthor) {
      if (!message.channelId) return res.status(403).json(apiErrorBody("Forbidden", null));
      const perms = await computeChannelPermissions({ userId, channelId: message.channelId });
      if (!hasPermission(perms, PERMISSION_BITS.MANAGE_MESSAGES)) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
    }
    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
    try {
      const io = getIo();
      if (io && message.channelId) {
        io.to(`channel:${message.channelId}`).emit("message:delete", { messageId });
      }
    } catch (emitErr) {
      console.warn("Socket emit failed for message:delete", emitErr?.message);
    }
    return res.json({ message: updated });
  } catch (error) {
    console.error("DELETE /discussions/messages/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to delete message", null));
  }
});

async function loadReactionsForMessage(messageId) {
  return prisma.discussionMessageReaction.findMany({
    where: { messageId },
    include: { user: { select: { id: true, full_name: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

async function emitReactionSocket(messageId, event, payload) {
  const msg = await prisma.discussionMessage.findUnique({
    where: { id: messageId },
    select: { channelId: true, groupDmId: true },
  });
  if (!msg) return;
  const io = getIo();
  if (!io) return;
  if (msg.channelId) {
    io.to(`channel:${msg.channelId}`).emit(event, payload);
  }
  if (msg.groupDmId) {
    io.to(`groupdm:${msg.groupDmId}`).emit(event, payload);
  }
}

router.get("/messages/:messageId/reactions", async (req, res) => {
  try {
    const userId = getCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    const reactions = await loadReactionsForMessage(messageId);
    return res.json({ reactions });
  } catch (error) {
    console.error("GET /discussions/messages/:messageId/reactions failed", error);
    return res.status(500).json(apiErrorBody("Failed to list reactions", null));
  }
});

router.delete("/messages/:messageId/reactions/:emoji", async (req, res) => {
  try {
    const userId = getCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    let emoji;
    try {
      emoji = decodeURIComponent(String(req.params.emoji ?? "")).trim();
    } catch {
      return res.status(400).json(apiErrorBody("Invalid emoji in path", null));
    }
    if (!emoji) {
      return res.status(400).json(apiErrorBody("emoji is required", null));
    }
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    await prisma.discussionMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    const reactions = await loadReactionsForMessage(messageId);
    await emitReactionSocket(messageId, "reaction:update", {
      messageId,
      reactions,
      emoji,
      userId,
      action: "remove",
    });
    return res.json({ reactions });
  } catch (error) {
    console.error("DELETE /discussions/messages/:messageId/reactions/:emoji failed", error);
    return res.status(500).json(apiErrorBody("Failed to remove reaction", null));
  }
});

router.post("/messages/:messageId/reactions", async (req, res) => {
  try {
    const userId = getCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    const parsed = reactionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
    }
    const emoji = parsed.data.emoji;
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    try {
      await prisma.discussionMessageReaction.create({
        data: { messageId, userId, emoji },
      });
    } catch (err) {
      if (err?.code === "P2002") {
        return res.status(409).json(apiErrorBody("Reaction already exists", null));
      }
      throw err;
    }
    const reactions = await loadReactionsForMessage(messageId);
    const targetMsg = await prisma.discussionMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, groupId: true, channelId: true },
    });
    const reactor = await prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true },
    });
    if (targetMsg && targetMsg.senderId !== userId) {
      await prisma.discussionNotification.create({
        data: {
          userId: targetMsg.senderId,
          groupId: targetMsg.groupId,
          messageId,
          type: "REACTION",
          payload: {
            groupId: targetMsg.groupId,
            channelId: targetMsg.channelId,
            messageId,
            reactorId: userId,
            reactorName: reactor?.full_name ?? null,
            emoji,
          },
        },
      });
    }
    await emitReactionSocket(messageId, "reaction:update", {
      messageId,
      reactions,
      emoji,
      userId,
      action: "add",
    });
    return res.status(201).json({ reactions });
  } catch (error) {
    console.error("POST /discussions/messages/:messageId/reactions failed", error);
    return res.status(500).json(apiErrorBody("Failed to add reaction", null));
  }
});

router.delete("/messages/:messageId/reactions", async (req, res) => {
  try {
    const userId = getCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const messageId = Number(req.params.messageId);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid messageId", null));
    }
    const parsed = reactionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
    }
    const emoji = parsed.data.emoji;
    try {
      await assertMessageReactionAllowed(userId, messageId);
    } catch (e) {
      const code = e?.statusCode ?? 500;
      if (code === 404) return res.status(404).json(apiErrorBody(e.message, null));
      if (code === 403) return res.status(403).json(apiErrorBody(e.message, null));
      throw e;
    }
    await prisma.discussionMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    const reactions = await loadReactionsForMessage(messageId);
    await emitReactionSocket(messageId, "reaction:update", {
      messageId,
      reactions,
      emoji,
      userId,
      action: "remove",
    });
    return res.json({ reactions });
  } catch (error) {
    console.error("DELETE /discussions/messages/:messageId/reactions failed", error);
    return res.status(500).json(apiErrorBody("Failed to remove reaction", null));
  }
});

export default router;
