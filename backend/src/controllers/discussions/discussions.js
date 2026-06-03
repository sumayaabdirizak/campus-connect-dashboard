import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody, prismaSchemaDriftHint } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import { requireRole } from "../../middleware/requireRole.js";
import { getDiscussionMetricsSnapshot, metricCount } from "../../features/discussions/reliability/metrics.js";
import { buildUnreadSocketPayload } from "../../features/discussions/buildUnreadPayload.js";
import serversRouter from "./servers.js";
import groupDmsRouter from "./groupDms.js";
import { extractMentionHandles, resolveMentionUserIds } from "../../features/discussions/mentionResolution.js";
import { loadUserAnnouncementScope } from "../../utils/userAnnouncementScope.js";
import { checkDiscussionUploadRateLimit } from "../../features/discussions/uploadRateLimit.js";
import {
  PERMISSION_BITS,
  computeChannelPermissions,
  hasPermission,
} from "../../features/discussions/permissions.js";
import { computeMemberPresence } from "../../features/discussions/discussionPresence.js";
import { enrichDiscussionNotificationsForApi } from "../../features/discussions/enrichDiscussionNotifications.js";
import { getSigningSecret } from "../../utils/signingSecret.js";
import {
  collectThreadParticipantSenderIds,
  resolveThreadRootMessageId,
} from "../../features/discussions/threadParticipants.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
  deriveQuestionFields,
  isDiscussionQaChannelNameKey,
} from "../../features/discussions/discussionMessagePublic.js";

const router = express.Router();

const UPLOAD_DIR = "./uploads/discussions";
const MAX_HISTORY_LIMIT = 100;
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "application/", "text/"];
const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
  FILE: 25 * 1024 * 1024,
};
const ATTACHMENT_SIGNING_SECRET = getSigningSecret("DISCUSSION_ATTACHMENT_SIGNING_SECRET");
const ATTACHMENT_URL_TTL_SECONDS = Number(process.env.DISCUSSION_ATTACHMENT_URL_TTL_SECONDS || 900);
const VIRUS_SCAN_MODE = String(process.env.DISCUSSION_VIRUS_SCAN_MODE || "off").toLowerCase();
const ARCHIVE_DIR = "./uploads/discussions-archive";

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
      file.originalname
    )}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMITS.VIDEO },
  fileFilter: (_, file, cb) => {
    const allowed = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
    if (!allowed) return cb(new Error("Unsupported file type"));
    cb(null, true);
  },
});

const sendMessageSchema = z.object({
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
  e2e: z
    .object({
      ciphertext: z.string().min(1),
      nonce: z.string().min(1),
      keyVersion: z.number().int().positive(),
      senderDeviceId: z.string().min(1).max(128),
    })
    .optional(),
});

const pinBodySchema = z.object({
  messageId: z.number().int().positive(),
});

const muteBodySchema = z.object({
  until: z.string().datetime().optional().nullable(),
});

const reactionBodySchema = z.object({
  emoji: z.string().trim().min(1).max(32),
});

const markReadSchema = z.object({
  notificationIds: z.array(z.number().int().positive()).optional(),
  groupId: z.number().int().positive().optional(),
  groupDmId: z.number().int().positive().optional(),
  markAll: z.boolean().optional(),
  upToCreatedAt: z.string().datetime().optional(),
});

const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(30),
  unreadOnly: z.coerce.boolean().optional().default(false),
  groupId: z.coerce.number().int().positive().optional(),
});

const registerDeviceSchema = z.object({
  deviceId: z.string().trim().min(1).max(128),
  publicKey: z.string().trim().min(16),
  algorithm: z.string().trim().min(1).max(64).default("X25519"),
});

const publishEpochSchema = z.object({
  keyVersion: z.number().int().positive(),
  algorithm: z.string().trim().min(1).max(64).default("X25519_AES_GCM"),
  envelopes: z
    .array(
      z.object({
        userId: z.number().int().positive(),
        deviceId: z.string().trim().min(1).max(128),
        encryptedKey: z.string().min(16),
        nonce: z.string().optional(),
      })
    )
    .min(1),
  rotationReason: z.string().trim().max(200).optional(),
});

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

function toAttachmentType(mimeType) {
  if (String(mimeType).startsWith("image/")) return "IMAGE";
  if (String(mimeType).startsWith("video/")) return "VIDEO";
  return "FILE";
}

function getSignedAttachmentToken({ attachmentId, userId, expiresAt }) {
  const payload = `${Number(attachmentId)}.${Number(userId)}.${Number(expiresAt)}`;
  const sig = crypto.createHmac("sha256", ATTACHMENT_SIGNING_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

function parseSignedAttachmentToken(token) {
  try {
    const decoded = Buffer.from(String(token || ""), "base64url").toString("utf8");
    const [attachmentIdRaw, userIdRaw, expiresAtRaw, signature] = decoded.split(".");
    const attachmentId = Number(attachmentIdRaw);
    const userId = Number(userIdRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(attachmentId) || !Number.isFinite(userId) || !Number.isFinite(expiresAt)) {
      return null;
    }
    const payload = `${attachmentId}.${userId}.${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", ATTACHMENT_SIGNING_SECRET)
      .update(payload)
      .digest("hex");
    if (expectedSignature !== signature) return null;
    if (Date.now() > expiresAt) return null;
    return { attachmentId, userId, expiresAt };
  } catch {
    return null;
  }
}

function buildAttachmentAccessUrl(req, attachmentId, userId, ttlSeconds = ATTACHMENT_URL_TTL_SECONDS) {
  const expiresAt = Date.now() + Math.max(60, ttlSeconds) * 1000;
  const token = getSignedAttachmentToken({ attachmentId, userId, expiresAt });
  return `${req.protocol}://${req.get("host")}/api/discussions/attachments/${attachmentId}/download?token=${token}`;
}

function attachmentDto(req, attachment, userId) {
  return {
    id: attachment.id,
    groupId: attachment.groupId,
    url: attachment.url,
    accessUrl: buildAttachmentAccessUrl(req, attachment.id, userId),
    fileType: attachment.fileType,
    mimeType: attachment.mimeType,
    size: Number(attachment.size),
    status: attachment.status,
    createdAt: attachment.createdAt,
    isE2EE: Boolean(attachment.ciphertextHash != null || attachment.keyVersion != null),
  };
}

async function scanUploadedFile(filePath) {
  // Modes: off | warn | block. Integrate ClamAV or a SaaS API inside try{} when ready.
  if (VIRUS_SCAN_MODE === "off") return { clean: true, mode: "off" };
  const simulate = String(process.env.DISCUSSION_VIRUS_SCAN_SIMULATE || "").toLowerCase();
  try {
    if (simulate === "dirty" || simulate === "infected") {
      if (VIRUS_SCAN_MODE === "block") {
        return { clean: false, mode: "block", reason: "simulated_positive" };
      }
      console.warn("[virus-scan] simulated infected file (warn mode):", filePath);
      return { clean: true, mode: "warn", warned: true, reason: "simulated_positive" };
    }
    // Placeholder: run real scanner on filePath
    return { clean: true, mode: VIRUS_SCAN_MODE };
  } catch (error) {
    if (VIRUS_SCAN_MODE === "block") {
      return { clean: false, reason: "virus_scan_failed", error: error?.message || "scan failed" };
    }
    console.warn("Virus scan warning:", error?.message || error);
    return { clean: true, mode: VIRUS_SCAN_MODE, warning: "scan_failed_but_allowed" };
  }
}

async function requireActiveMembership(groupId, userId) {
  const membership = await prisma.discussionGroupMembership.findFirst({
    where: {
      groupId,
      userId,
      leftAt: null,
      isActive: true,
      group: { status: "ACTIVE" },
    },
    include: {
      group: {
        select: {
          id: true,
          status: true,
          e2eeEnabled: true,
          e2eeCurrentKeyVersion: true,
          e2eeRotationRequired: true,
          kind: true,
          defaultChannelId: true,
        },
      },
    },
  });
  return membership;
}

function canManageGroup(membership) {
  return membership?.canModerate === true;
}

async function resolveE2EERequirement(groupId) {
  const group = await prisma.discussionGroup.findUnique({
    where: { id: groupId },
    select: { e2eeEnabled: true },
  });
  return group?.e2eeEnabled !== false;
}

router.get("/me/groups/muted", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const rows = await prisma.discussionMuteSetting.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            groupKey: true,
            scopeType: true,
            scopeId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const results = rows.map((r) => ({
      groupId: r.groupId,
      until: r.until,
      createdAt: r.createdAt,
      group: r.group,
    }));
    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/me/groups/muted failed", error);
    return res.status(500).json(apiErrorBody("Failed to list muted groups", null));
  }
});

router.post("/me/groups/:groupId/mute", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const parsed = muteBodySchema.parse(req.body ?? {});
    const until = parsed.until ? new Date(parsed.until) : null;
    if (until && Number.isNaN(until.getTime())) {
      return res.status(400).json(apiErrorBody("Invalid until datetime", null));
    }
    const row = await prisma.discussionMuteSetting.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId, until },
      update: { until },
    });
    return res.status(200).json({ ok: true, groupId, until: row.until, createdAt: row.createdAt });
  } catch (error) {
    console.error("POST /discussions/me/groups/:groupId/mute failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to mute group", null));
  }
});

router.delete("/me/groups/:groupId/mute", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const result = await prisma.discussionMuteSetting.deleteMany({
      where: { userId, groupId },
    });
    return res.json({ ok: true, deletedCount: result.count });
  } catch (error) {
    console.error("DELETE /discussions/me/groups/:groupId/mute failed", error);
    return res.status(500).json(apiErrorBody("Failed to unmute group", null));
  }
});

const patchDiscussionMeStatusSchema = z.object({
  status: z.union([z.string(), z.null()]),
});

/** Faculties from announcement scope (same ids as loadUserAnnouncementScope) + saved discussions status line. */
router.get("/me/workspaces", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json(apiErrorBody("Unauthorized", null));
    }
    const loaded = await loadUserAnnouncementScope(prisma, userId);
    if (!loaded) {
      return res.json({ faculties: [], discussionCustomStatus: null });
    }
    const faculties =
      loaded.facultyIds.length === 0
        ? []
        : await prisma.faculty.findMany({
            where: { id: { in: loaded.facultyIds } },
            orderBy: { name: "asc" },
            select: { id: true, code: true, name: true },
          });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { discussionCustomStatus: true },
    });
    return res.json({
      faculties,
      discussionCustomStatus: user?.discussionCustomStatus ?? null,
    });
  } catch (error) {
    console.error("GET /discussions/me/workspaces failed", error);
    return res.status(500).json(apiErrorBody("Failed to load workspaces", null));
  }
});

/** Discussions presence line (In class, Do Not Disturb, etc.). Stored on User.discussionCustomStatus. */
router.patch("/me/status", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json(apiErrorBody("Unauthorized", null));
    }
    const parsed = patchDiscussionMeStatusSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid body", parsed.error.flatten()));
    }
    const raw = parsed.data.status;
    const next =
      raw === null || raw === undefined
        ? null
        : String(raw)
            .trim()
            .slice(0, 80) || null;
    await prisma.user.update({
      where: { id: userId },
      data: { discussionCustomStatus: next },
    });
    return res.json({ discussionCustomStatus: next });
  } catch (error) {
    console.error("PATCH /discussions/me/status failed", error);
    return res.status(500).json(apiErrorBody("Failed to update status", null));
  }
});

router.get("/me/groups", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const memberships = await prisma.discussionGroupMembership.findMany({
      where: { userId, leftAt: null, isActive: true, group: { status: "ACTIVE" } },
      include: {
        group: {
          include: {
            messages: {
              take: 1,
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              include: { sender: { select: { id: true, full_name: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const groupIds = memberships.map((m) => m.groupId);
    const unreadCounts = groupIds.length
      ? await prisma.discussionNotification.groupBy({
          by: ["groupId"],
          where: { userId, readAt: null, groupId: { in: groupIds } },
          _count: { groupId: true },
        })
      : [];
    const unreadByGroup = new Map(unreadCounts.map((x) => [x.groupId, x._count.groupId]));

    const deptScopeIds = new Set();
    const batchScopeIds = new Set();
    const sectionScopeIds = new Set();
    for (const m of memberships) {
      const st = m.group.scopeType;
      if (st === "DEPARTMENT") deptScopeIds.add(m.group.scopeId);
      else if (st === "BATCH") batchScopeIds.add(m.group.scopeId);
      else if (st === "SECTION") sectionScopeIds.add(m.group.scopeId);
    }

    const [deptRows, batchRows, sectionRows] = await Promise.all([
      deptScopeIds.size
        ? prisma.department.findMany({
            where: { id: { in: [...deptScopeIds] } },
            select: { id: true, facultyId: true },
          })
        : [],
      batchScopeIds.size
        ? prisma.batch.findMany({
            where: { id: { in: [...batchScopeIds] } },
            select: {
              id: true,
              program: { select: { department: { select: { facultyId: true } } } },
            },
          })
        : [],
      sectionScopeIds.size
        ? prisma.batchSection.findMany({
            where: { id: { in: [...sectionScopeIds] } },
            select: {
              id: true,
              batch: { select: { program: { select: { department: { select: { facultyId: true } } } } } },
            },
          })
        : [],
    ]);

    const deptFaculty = new Map(deptRows.map((d) => [d.id, d.facultyId]));
    const batchFaculty = new Map(
      batchRows.map((b) => [b.id, b.program?.department?.facultyId ?? null])
    );
    const sectionFaculty = new Map(
      sectionRows.map((s) => [s.id, s.batch?.program?.department?.facultyId ?? null])
    );

    const results = memberships.map((membership) => {
      const lastMessage = membership.group.messages?.[0] ?? null;
      const g = membership.group;
      let contextFacultyId = null;
      if (g.scopeType === "FACULTY") contextFacultyId = g.scopeId;
      else if (g.scopeType === "DEPARTMENT") contextFacultyId = deptFaculty.get(g.scopeId) ?? null;
      else if (g.scopeType === "BATCH") contextFacultyId = batchFaculty.get(g.scopeId) ?? null;
      else if (g.scopeType === "SECTION") contextFacultyId = sectionFaculty.get(g.scopeId) ?? null;
      return {
        groupId: membership.group.id,
        groupKey: membership.group.groupKey,
        name: membership.group.name,
        scopeType: membership.group.scopeType,
        scopeId: membership.group.scopeId,
        contextFacultyId,
        e2eeEnabled: membership.group.e2eeEnabled,
        e2eeCurrentKeyVersion: membership.group.e2eeCurrentKeyVersion,
        e2eeRotationRequired: membership.group.e2eeRotationRequired,
        myRole: membership.role,
        myCanPost: membership.canPost,
        myCanModerate: membership.canModerate,
        unreadCount: unreadByGroup.get(membership.group.id) ?? 0,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              ciphertext: lastMessage.ciphertext,
              messageType: lastMessage.messageType,
              createdAt: lastMessage.createdAt,
              sender: lastMessage.sender
                ? { id: lastMessage.sender.id, full_name: lastMessage.sender.full_name }
                : null,
            }
          : null,
      };
    });

    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/me/groups failed", error);
    return res.status(500).json(apiErrorBody("Failed to list discussion groups", null));
  }
});

/** Channel header: canonical name, topic (description), counts, mute state. */
router.get("/groups/:groupId", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }

    const membership = await prisma.discussionGroupMembership.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null,
        isActive: true,
        group: { status: "ACTIVE" },
      },
      include: {
        group: {
          select: {
            id: true,
            groupKey: true,
            name: true,
            description: true,
            scopeType: true,
            scopeId: true,
            iconUrl: true,
            e2eeEnabled: true,
            e2eeCurrentKeyVersion: true,
            e2eeRotationRequired: true,
            kind: true,
          },
        },
      },
    });
    if (!membership) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }

    const g = membership.group;
    const now = new Date();
    const [memberCount, pinCount, muteRow] = await Promise.all([
      prisma.discussionGroupMembership.count({
        where: { groupId, leftAt: null, isActive: true },
      }),
      prisma.discussionPinnedMessage.count({
        where: { groupId, unpinnedAt: null },
      }),
      prisma.discussionMuteSetting.findUnique({
        where: { userId_groupId: { userId, groupId } },
      }),
    ]);

    const muted =
      !!muteRow &&
      (muteRow.until == null || (muteRow.until instanceof Date && muteRow.until > now));

    return res.json({
      id: g.id,
      groupKey: g.groupKey,
      name: g.name,
      description: g.description,
      topic: g.description,
      scopeType: g.scopeType,
      scopeId: g.scopeId,
      iconUrl: g.iconUrl,
      e2eeEnabled: g.e2eeEnabled,
      e2eeCurrentKeyVersion: g.e2eeCurrentKeyVersion,
      e2eeRotationRequired: g.e2eeRotationRequired,
      kind: g.kind,
      memberCount,
      activePinCount: pinCount,
      myRole: membership.role,
      myCanPost: membership.canPost,
      myCanModerate: membership.canModerate,
      mute: {
        muted,
        until: muteRow?.until ? muteRow.until.toISOString() : null,
      },
      qaChannel: isDiscussionQaChannelNameKey(g.groupKey, g.name),
    });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId failed", error);
    return res.status(500).json(apiErrorBody("Failed to load group", null));
  }
});

router.get("/groups/:groupId/messages", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    const limit = parseLimit(req.query.limit);
    const rawCursor = req.query.cursor;
    const hasCursor =
      rawCursor != null && String(rawCursor).trim() !== "" && String(rawCursor).toLowerCase() !== "null";
    const cursor = hasCursor ? decodeCursor(rawCursor) : null;
    if (hasCursor && !cursor) {
      return res.status(400).json(apiErrorBody("Invalid or unreadable cursor", null));
    }
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }

    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));

    const groupRow = await prisma.discussionGroup.findUnique({
      where: { id: groupId },
      select: { kind: true, defaultChannelId: true },
    });

    const parentIdRaw = req.query.parentId ?? req.query.parentMessageId;
    const parentMessageId =
      parentIdRaw != null && String(parentIdRaw).trim() !== ""
        ? Number(parentIdRaw)
        : null;
    if (parentMessageId != null && !Number.isFinite(parentMessageId)) {
      return res.status(400).json(apiErrorBody("Invalid parentId", null));
    }

    const whereParts = [{ groupId }, { deletedAt: null }];
    if (parentMessageId != null && Number.isFinite(parentMessageId)) {
      whereParts.push({ parentMessageId });
    } else {
      whereParts.push({ parentMessageId: null });
    }
    if (cursor) {
      whereParts.push({
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      });
    }
    if (
      groupRow &&
      (groupRow.kind === "FACULTY_SERVER" || groupRow.kind === "USER_SERVER") &&
      groupRow.defaultChannelId != null
    ) {
      whereParts.push({
        OR: [{ channelId: null }, { channelId: groupRow.defaultChannelId }],
      });
    }
    const where = whereParts.length > 1 ? { AND: whereParts } : whereParts[0];

    const messages = await prisma.discussionMessage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
      },
    });

    const hasMore = messages.length > limit;
    const pageRows = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor =
      hasMore && pageRows.length
        ? encodeCursor(pageRows[pageRows.length - 1].createdAt, pageRows[pageRows.length - 1].id)
        : null;

    const hydrated = pageRows
      .reverse()
      .map((message) => {
        const base = {
          ...message,
          attachments: (message.attachments || []).map((attachment) =>
            attachmentDto(req, attachment, userId)
          ),
        };
        return applyAnonymousSenderPolicy(base, userId, membership);
      });

    let resultsPayload = hydrated;
    if (parentMessageId == null && hydrated.length > 0) {
      const rootIds = hydrated.map((m) => m.id);
      const [countRows, recentReplies] = await Promise.all([
        prisma.discussionMessage.groupBy({
          by: ["parentMessageId"],
          where: { groupId, deletedAt: null, parentMessageId: { in: rootIds } },
          _count: { id: true },
        }),
        prisma.discussionMessage.findMany({
          where: { groupId, deletedAt: null, parentMessageId: { in: rootIds } },
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
        if (pr.previewSenders.length < 2 && (r.senderId || r.isAnonymous)) {
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
      resultsPayload = hydrated.map((m) => ({
        ...m,
        threadPreview: previewByRoot.get(m.id) ?? null,
      }));
    }

    return res.json({
      results: resultsPayload,
      meta: {
        nextCursor,
        hasMore,
        parentMessageId: parentMessageId != null && Number.isFinite(parentMessageId) ? parentMessageId : null,
      },
    });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId/messages failed", error);
    const hint = prismaSchemaDriftHint(error);
    return res.status(500).json(apiErrorBody(`Failed to fetch messages.${hint}`, null));
  }
});

router.post("/uploads", upload.single("file"), async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const groupIdRaw = Number(req.body?.groupId);
    const channelIdRaw = Number(req.body?.channelId);
    let resolvedGroupId = null;
    let e2eeRequired = false;

    if (Number.isInteger(channelIdRaw) && channelIdRaw > 0) {
      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelIdRaw },
        select: {
          id: true,
          serverId: true,
          server: { select: { e2eeEnabled: true } },
        },
      });
      if (!channel) {
        return res.status(404).json(apiErrorBody("Channel not found", null));
      }
      const perms = await computeChannelPermissions({ userId, channelId: channelIdRaw });
      if (!hasPermission(perms, PERMISSION_BITS.SEND_MESSAGES)) {
        return res.status(403).json(apiErrorBody("Forbidden", null));
      }
      resolvedGroupId = channel.serverId;
      e2eeRequired = channel.server?.e2eeEnabled !== false;
    } else if (Number.isInteger(groupIdRaw) && groupIdRaw > 0) {
      const membership = await requireActiveMembership(groupIdRaw, userId);
      if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
      resolvedGroupId = groupIdRaw;
      e2eeRequired = membership.group?.e2eeEnabled !== false;
    } else {
      return res.status(400).json(apiErrorBody("groupId or channelId is required", null));
    }

    if (!(await checkDiscussionUploadRateLimit(userId))) {
      return res.status(429).json(apiErrorBody("Upload rate limit exceeded", null));
    }
    if (e2eeRequired) {
      if (!req.body?.ciphertextHash || !req.body?.keyVersion || !req.body?.nonce) {
        return res.status(400).json(
          apiErrorBody(
            "Encrypted uploads require ciphertextHash, keyVersion, and nonce metadata",
            null
          )
        );
      }
    }
    if (!req.file) {
      return res.status(400).json(apiErrorBody("file is required", null));
    }

    const fileType = toAttachmentType(req.file.mimetype);
    const maxSize = FILE_SIZE_LIMITS[fileType];
    if (req.file.size > maxSize) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
      return res
        .status(413)
        .json(apiErrorBody(`File too large for ${fileType}. Max ${Math.round(maxSize / 1024 / 1024)}MB`, null));
    }

    const scanResult = await scanUploadedFile(req.file.path);
    if (!scanResult.clean) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
      return res.status(400).json(apiErrorBody("Uploaded file failed security scan", null));
    }

    const hostBase = `${req.protocol}://${req.get("host")}`;
    const url = `${hostBase}/uploads/discussions/${req.file.filename}`;
    const attachment = await prisma.discussionAttachment.create({
      data: {
        uploadedById: userId,
        groupId: resolvedGroupId,
        url,
        storageKey: req.file.filename,
        fileType,
        mimeType: req.file.mimetype,
        size: BigInt(req.file.size),
        status: "PENDING",
        ciphertextHash: req.body?.ciphertextHash ? String(req.body.ciphertextHash) : null,
        keyVersion: req.body?.keyVersion ? Number(req.body.keyVersion) : null,
        nonce: req.body?.nonce ? String(req.body.nonce) : null,
      },
    });

    return res.status(201).json(attachmentDto(req, attachment, userId));
  } catch (error) {
    console.error("POST /discussions/uploads failed", error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json(apiErrorBody(error.message, null));
    }
    if (error instanceof Error && error.message === "Unsupported file type") {
      return res.status(415).json(apiErrorBody(error.message, null));
    }
    return res.status(500).json(apiErrorBody("Failed to upload attachment", null));
  }
});

router.get("/attachments/:id/access-url", async (req, res) => {
  try {
    const attachmentId = Number(req.params.id);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(attachmentId)) {
      return res.status(400).json(apiErrorBody("Invalid attachment id", null));
    }
    const attachment = await prisma.discussionAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, groupId: true, uploadedById: true },
    });
    if (!attachment) return res.status(404).json(apiErrorBody("Attachment not found", null));
    if (attachment.groupId) {
      const membership = await requireActiveMembership(attachment.groupId, userId);
      if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    } else if (attachment.uploadedById !== userId) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }
    return res.json({
      attachmentId,
      accessUrl: buildAttachmentAccessUrl(req, attachmentId, userId),
      expiresInSeconds: ATTACHMENT_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error("GET /discussions/attachments/:id/access-url failed", error);
    return res.status(500).json(apiErrorBody("Failed to generate attachment URL", null));
  }
});

router.get("/attachments/:id/download", async (req, res) => {
  try {
    const attachmentId = Number(req.params.id);
    const tokenPayload = parseSignedAttachmentToken(req.query?.token);
    if (!Number.isFinite(attachmentId) || !tokenPayload || tokenPayload.attachmentId !== attachmentId) {
      return res.status(401).json(apiErrorBody("Invalid or expired attachment token", null));
    }
    const attachment = await prisma.discussionAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        groupId: true,
        uploadedById: true,
        storageKey: true,
        mimeType: true,
      },
    });
    if (!attachment) return res.status(404).json(apiErrorBody("Attachment not found", null));
    if (attachment.groupId) {
      const membership = await requireActiveMembership(attachment.groupId, tokenPayload.userId);
      if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    } else if (attachment.uploadedById !== tokenPayload.userId) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }
    if (!attachment.storageKey) {
      return res.status(410).json(apiErrorBody("Attachment binary is unavailable", null));
    }
    const absolutePath = path.resolve(UPLOAD_DIR, attachment.storageKey);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json(apiErrorBody("Attachment file not found", null));
    }
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error("GET /discussions/attachments/:id/download failed", error);
    return res.status(500).json(apiErrorBody("Failed to download attachment", null));
  }
});

router.post("/groups/:groupId/messages", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!membership.canPost) return res.status(403).json(apiErrorBody("Posting is disabled for this user", null));

    const parsed = sendMessageSchema.parse(req.body ?? {});
    const attachmentIds = parsed.attachmentIds ?? [];
    const parentMessageId = parsed.parentMessageId ?? null;

    const derived = deriveQuestionFields({
      content: parsed.content ?? "",
      messageType: parsed.messageType,
      postAsQuestion: parsed.postAsQuestion,
      isAnonymous: parsed.isAnonymous,
      parentMessageId,
    });
    const effectiveContent = derived.contentStored.trim();
    const hasText = effectiveContent.length > 0;
    let messageType =
      attachmentIds.length > 0 && !hasText ? "MEDIA" : derived.messageType;
    let isAnonymousFlag = derived.isAnonymous;
    if (messageType !== "QUESTION") isAnonymousFlag = false;
    if (messageType === "QUESTION" && !hasText) {
      return res.status(400).json(apiErrorBody("Question text is required", null));
    }
    const e2eeRequired = await resolveE2EERequirement(groupId);
    if (e2eeRequired && !parsed.e2e) {
      return res.status(400).json(
        apiErrorBody(
          "E2E payload is required for this group (ciphertext, nonce, keyVersion, senderDeviceId)",
          null
        )
      );
    }
    if (!hasText && attachmentIds.length === 0) {
      return res.status(400).json(apiErrorBody("Either content or attachmentIds is required", null));
    }

    if (parentMessageId != null) {
      const parent = await prisma.discussionMessage.findFirst({
        where: {
          id: parentMessageId,
          groupId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!parent) {
        return res.status(400).json(apiErrorBody("parentMessageId not found in this group", null));
      }
    }

    let pendingAttachments = [];
    if (attachmentIds.length > 0) {
      pendingAttachments = await prisma.discussionAttachment.findMany({
        where: {
          id: { in: attachmentIds },
          uploadedById: userId,
          status: "PENDING",
          messageId: null,
          OR: [{ groupId }, { groupId: null }],
        },
      });
      if (pendingAttachments.length !== attachmentIds.length) {
        return res.status(400).json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
      }
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.discussionMessage.create({
        data: {
          groupId,
          senderId: userId,
          parentMessageId: parentMessageId ?? undefined,
          content: e2eeRequired ? null : hasText ? effectiveContent : null,
          messageType,
          isAnonymous: isAnonymousFlag,
          ciphertext: parsed.e2e?.ciphertext ?? null,
          nonce: parsed.e2e?.nonce ?? null,
          keyVersion: parsed.e2e?.keyVersion ?? null,
          senderDeviceId: parsed.e2e?.senderDeviceId ?? null,
        },
        include: {
          sender: { select: { id: true, full_name: true } },
        },
      });

      if (attachmentIds.length > 0) {
        await tx.discussionAttachment.updateMany({
          where: { id: { in: attachmentIds }, uploadedById: userId, messageId: null },
          data: { messageId: created.id, groupId, status: "LINKED" },
        });
      }

      const members = await tx.discussionGroupMembership.findMany({
        where: { groupId, leftAt: null, isActive: true, userId: { not: userId } },
        select: {
          userId: true,
          user: { select: { id: true, number: true, full_name: true } },
        },
      });
      const memberRows = members.map((m) => ({
        userId: m.userId,
        number: m.user?.number ?? "",
        full_name: m.user?.full_name ?? "",
      }));
      const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));

      const plaintext = e2eeRequired ? "" : hasText ? effectiveContent : "";
      const handles = extractMentionHandles(plaintext);
      const mentionUserIds = new Set(
        resolveMentionUserIds(handles, memberRows, userId).filter((id) => memberIdSet.has(id))
      );

      const recipientIds = members.map((member) => Number(member.userId));
      const messageRecipients = recipientIds.filter((rid) => !mentionUserIds.has(rid));
      if (messageRecipients.length) {
        await tx.discussionNotification.createMany({
          data: messageRecipients.map((recipientId) => ({
            userId: recipientId,
            groupId,
            messageId: created.id,
            type: "MESSAGE",
            payload: {
              groupId,
              messageId: created.id,
              senderId: userId,
              senderName: anonymousSafeSenderName({ isAnonymous: isAnonymousFlag, sender: created.sender }),
            },
          })),
        });
      }
      if (mentionUserIds.size) {
        await tx.discussionNotification.createMany({
          data: [...mentionUserIds].map((recipientId) => ({
            userId: recipientId,
            groupId,
            messageId: created.id,
            type: "MENTION",
            payload: {
              groupId,
              messageId: created.id,
              senderId: userId,
              senderName: anonymousSafeSenderName({ isAnonymous: isAnonymousFlag, sender: created.sender }),
            },
          })),
        });
      }

      if (parentMessageId != null) {
        const rootId = await resolveThreadRootMessageId(tx, {
          groupId,
          channelId: null,
          replyParentMessageId: parentMessageId,
        });
        if (rootId != null) {
          const threadTargets = await collectThreadParticipantSenderIds(tx, {
            groupId,
            channelId: null,
            rootMessageId: rootId,
            excludeUserId: userId,
          });
          if (threadTargets.length > 0) {
            await tx.discussionNotification.createMany({
              data: threadTargets.map((uid) => ({
                userId: uid,
                groupId,
                messageId: created.id,
                type: "THREAD",
                payload: {
                  groupId,
                  messageId: created.id,
                  threadRootMessageId: rootId,
                  senderId: userId,
                  senderName: anonymousSafeSenderName({ isAnonymous: isAnonymousFlag, sender: created.sender }),
                },
              })),
            });
          }
        }
      }

      return created;
    });

    const fullMessage = await prisma.discussionMessage.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
      },
    });
    const fullMessageDtoRaw = {
      ...fullMessage,
      attachments: (fullMessage?.attachments || []).map((attachment) =>
        attachmentDto(req, attachment, userId)
      ),
    };
    const fullMessageDto = applyAnonymousSenderPolicy(fullMessageDtoRaw, userId, membership);
    const wsMessageDto = fullMessageDtoRaw.isAnonymous
      ? applyAnonymousSenderPolicy(fullMessageDtoRaw, null, null, { broadcast: true })
      : fullMessageDtoRaw;

    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("discussion:message:new", wsMessageDto);
      const unread = await prisma.discussionNotification.groupBy({
        by: ["userId", "groupId"],
        where: {
          readAt: null,
          groupId,
          userId: { not: userId },
        },
        _count: { groupId: true },
      });
      const users = [...new Set(unread.map((u) => Number(u.userId)))];
      for (const uid of users) {
        const payload = await buildUnreadSocketPayload(uid);
        io.to(`user:${uid}`).emit("unread:update", payload);
      }
    }

    return res.status(201).json(fullMessageDto);
  } catch (error) {
    console.error("POST /discussions/groups/:groupId/messages failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to send message", null));
  }
});

router.get("/groups/:groupId/members", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const rows = await prisma.discussionGroupMembership.findMany({
      where: { groupId, leftAt: null, isActive: true },
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
    console.error("GET /discussions/groups/:groupId/members failed", error);
    return res.status(500).json(apiErrorBody("Failed to list members", null));
  }
});

/** Member presence: session + last activity windows (online / away / offline / DND). */
router.get("/groups/:groupId/presence", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));

    const rows = await prisma.discussionGroupMembership.findMany({
      where: { groupId, leftAt: null, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            discussionCustomStatus: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const memberIds = rows.map((r) => Number(r.userId));
    const sessions =
      memberIds.length === 0
        ? []
        : await prisma.discussionSession.findMany({
            where: { userId: { in: memberIds } },
            select: { userId: true, lastSeenAt: true, disconnectedAt: true },
          });

    const byUser = new Map();
    for (const s of sessions) {
      const uid = Number(s.userId);
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid).push(s);
    }

    const now = Date.now();
    const results = rows.map((r) => {
      const uid = Number(r.userId);
      const list = byUser.get(uid) ?? [];
      const open = list.filter((x) => x.disconnectedAt == null);
      const hasOpenSession = open.length > 0;
      let lastActivityAt = null;
      if (open.length > 0) {
        lastActivityAt = open.reduce((best, cur) =>
          cur.lastSeenAt > best.lastSeenAt ? cur : best
        ).lastSeenAt;
      } else if (list.length > 0) {
        lastActivityAt = list.reduce((best, cur) => (cur.lastSeenAt > best.lastSeenAt ? cur : best)).lastSeenAt;
      }

      const pres = computeMemberPresence({
        now,
        hasOpenSession,
        lastActivityAt,
        discussionCustomStatus: r.user?.discussionCustomStatus ?? null,
      });

      return {
        userId: uid,
        membershipRole: r.role,
        user: r.user
          ? {
              id: r.user.id,
              full_name: r.user.full_name,
              discussionCustomStatus: r.user.discussionCustomStatus,
              roleName: r.user.role?.name ?? null,
            }
          : null,
        presence: pres.presence,
        lastSeenAt: pres.lastSeenAt,
        statusLine: pres.statusLine,
        sessionConnected: pres.sessionConnected,
        suppressPings: pres.suppressPings,
        idleExtended: pres.idleExtended ?? false,
      };
    });

    return res.json({ groupId, results });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId/presence failed", error);
    return res.status(500).json(apiErrorBody("Failed to load presence", null));
  }
});

/** Pinned messages for channel header + “View all” panel (newest first). */
router.get("/groups/:groupId/pins", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const pins = await prisma.discussionPinnedMessage.findMany({
      where: { groupId, unpinnedAt: null },
      orderBy: { pinnedAt: "desc" },
      include: {
        message: {
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        },
        pinnedBy: { select: { id: true, full_name: true } },
      },
    });
    const results = pins
      .filter((p) => p.message && !p.message.deletedAt)
      .map((p) => {
        const msgRaw = {
          ...p.message,
          attachments: (p.message.attachments || []).map((a) => attachmentDto(req, a, userId)),
        };
        return {
          id: p.id,
          groupId: p.groupId,
          messageId: p.messageId,
          pinnedAt: p.pinnedAt,
          pinnedBy: p.pinnedBy,
          message: applyAnonymousSenderPolicy(msgRaw, userId, membership),
        };
      });
    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId/pins failed", error);
    return res.status(500).json(apiErrorBody("Failed to list pins", null));
  }
});

router.post("/groups/:groupId/pins", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!membership.canModerate) {
      return res.status(403).json(apiErrorBody("Only moderators can pin messages", null));
    }
    const parsed = pinBodySchema.parse(req.body ?? {});
    const message = await prisma.discussionMessage.findFirst({
      where: { id: parsed.messageId, groupId, deletedAt: null },
      select: { id: true },
    });
    if (!message) {
      return res.status(404).json(apiErrorBody("Message not found in this group", null));
    }
    const existing = await prisma.discussionPinnedMessage.findFirst({
      where: { groupId, messageId: parsed.messageId, unpinnedAt: null },
    });
    if (existing) {
      return res.status(409).json(apiErrorBody("Message is already pinned", null));
    }
    const pin = await prisma.discussionPinnedMessage.create({
      data: {
        groupId,
        messageId: parsed.messageId,
        pinnedById: userId,
      },
      include: {
        message: {
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        },
        pinnedBy: { select: { id: true, full_name: true } },
      },
    });
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:pinned", {
        groupId,
        messageId: pin.messageId,
        pinnedById: userId,
        pinnedAt: pin.pinnedAt,
      });
    }
    const pinMembers = await prisma.discussionGroupMembership.findMany({
      where: { groupId, leftAt: null, isActive: true, userId: { not: userId } },
      select: { userId: true },
    });
    if (pinMembers.length > 0) {
      await prisma.discussionNotification.createMany({
        data: pinMembers.map((m) => ({
          userId: m.userId,
          groupId,
          messageId: parsed.messageId,
          type: "PIN",
          payload: {
            groupId,
            messageId: parsed.messageId,
            pinnedById: userId,
            pinnedByName: pin.pinnedBy?.full_name ?? null,
          },
        })),
      });
    }
    return res.status(201).json({
      pin: {
        id: pin.id,
        groupId: pin.groupId,
        messageId: pin.messageId,
        pinnedAt: pin.pinnedAt,
        pinnedBy: pin.pinnedBy,
        message: pin.message
          ? {
              ...pin.message,
              attachments: (pin.message.attachments || []).map((a) => attachmentDto(req, a, userId)),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("POST /discussions/groups/:groupId/pins failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to pin message", null));
  }
});

router.delete("/groups/:groupId/pins/:messageId", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!membership.canModerate) {
      return res.status(403).json(apiErrorBody("Only moderators can unpin messages", null));
    }
    const result = await prisma.discussionPinnedMessage.updateMany({
      where: { groupId, messageId, unpinnedAt: null },
      data: { unpinnedAt: new Date() },
    });
    const io = getIo();
    if (io && result.count) {
      io.to(`discussion:group:${groupId}`).emit("message:unpinned", { groupId, messageId });
    }
    return res.json({ ok: true, updatedCount: result.count });
  } catch (error) {
    console.error("DELETE /discussions/groups/:groupId/pins/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to unpin message", null));
  }
});

const acceptedAnswerBodySchema = z.object({
  accepted: z.boolean(),
});

/** Q&A: one accepted reply per thread (same parentMessageId). */
router.post("/groups/:groupId/messages/:messageId/accepted-answer", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));

    const group = await prisma.discussionGroup.findUnique({
      where: { id: groupId },
      select: { name: true, groupKey: true },
    });
    if (!group) {
      return res.status(400).json(apiErrorBody("Group not found", null));
    }

    const role = String(membership.role || "").toUpperCase();
    const canMark =
      membership.canModerate ||
      ["TA", "ADVISOR", "HEAD", "LECTURER", "ADMIN", "DEAN"].includes(role);
    if (!canMark) {
      return res.status(403).json(apiErrorBody("You cannot mark an answer in this channel", null));
    }

    const parsed = acceptedAnswerBodySchema.parse(req.body ?? {});
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true, parentMessageId: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    if (msg.parentMessageId == null) {
      return res
        .status(400)
        .json(apiErrorBody("Only thread replies can be marked as the accepted answer", null));
    }
    const parentId = msg.parentMessageId;
    const parentRoot = await prisma.discussionMessage.findFirst({
      where: { id: parentId, groupId, deletedAt: null },
      select: { id: true, messageType: true },
    });
    const inQaChannel = isDiscussionQaChannelNameKey(group.groupKey, group.name);
    const parentIsQuestion = parentRoot?.messageType === "QUESTION";
    if (!inQaChannel && !parentIsQuestion) {
      return res
        .status(400)
        .json(
          apiErrorBody(
            "Accepted answer is only available in Q&A-style channels or on question threads",
            null
          )
        );
    }

    if (parsed.accepted) {
      await prisma.discussionMessage.updateMany({
        where: { groupId, parentMessageId: parentId, deletedAt: null },
        data: { isAcceptedAnswer: false },
      });
      await prisma.discussionMessage.update({
        where: { id: messageId },
        data: { isAcceptedAnswer: true },
      });
    } else {
      await prisma.discussionMessage.update({
        where: { id: messageId },
        data: { isAcceptedAnswer: false },
      });
    }

    const winner = await prisma.discussionMessage.findFirst({
      where: { groupId, parentMessageId: parentId, deletedAt: null, isAcceptedAnswer: true },
      select: { id: true },
    });

    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:accepted-answer", {
        groupId,
        parentMessageId: parentId,
        acceptedMessageId: winner?.id ?? null,
      });
    }

    return res.json({
      ok: true,
      parentMessageId: parentId,
      acceptedMessageId: winner?.id ?? null,
    });
  } catch (error) {
    console.error(
      "POST /discussions/groups/:groupId/messages/:messageId/accepted-answer failed",
      error
    );
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to update accepted answer", null));
  }
});

router.patch("/groups/:groupId/messages/:messageId", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    if (Number(msg.senderId) !== userId) {
      return res.status(403).json(apiErrorBody("Only the author can edit this message", null));
    }
    const parsed = editMessageSchema.parse(req.body ?? {});
    const e2eeRequired = await resolveE2EERequirement(groupId);
    if (e2eeRequired) {
      if (!parsed.e2e) {
        return res.status(400).json(
          apiErrorBody("E2E payload is required to edit messages in this group", null)
        );
      }
    }
    const hasContent = typeof parsed.content === "string" && parsed.content.trim().length > 0;
    if (!e2eeRequired && !hasContent && !parsed.e2e) {
      return res.status(400).json(apiErrorBody("content or e2e payload is required", null));
    }
    const updated = await prisma.discussionMessage.update({
      where: { id: messageId },
      data: {
        editedAt: new Date(),
        content: e2eeRequired ? null : hasContent ? parsed.content.trim() : msg.content,
        ciphertext: parsed.e2e?.ciphertext ?? msg.ciphertext,
        nonce: parsed.e2e?.nonce ?? msg.nonce,
        keyVersion: Number.isFinite(Number(parsed.e2e?.keyVersion))
          ? Number(parsed.e2e.keyVersion)
          : msg.keyVersion,
        senderDeviceId: parsed.e2e?.senderDeviceId ?? msg.senderDeviceId,
      },
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
      },
    });
    const dto = {
      ...updated,
      attachments: (updated.attachments || []).map((a) => attachmentDto(req, a, userId)),
    };
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:edited", {
        groupId,
        messageId,
        content: dto.content,
        ciphertext: dto.ciphertext,
        nonce: dto.nonce,
        editedAt: dto.editedAt,
      });
    }
    return res.json({ message: dto });
  } catch (error) {
    console.error("PATCH /discussions/groups/:groupId/messages/:messageId failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to edit message", null));
  }
});

router.delete("/groups/:groupId/messages/:messageId", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true, senderId: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const isAuthor = Number(msg.senderId) === userId;
    if (!isAuthor && !membership.canModerate) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }
    await prisma.discussionMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: null,
        ciphertext: null,
        nonce: null,
      },
    });
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("message:deleted", {
        groupId,
        messageId,
        deletedAt: new Date().toISOString(),
      });
    }
    return res.json({ ok: true, messageId });
  } catch (error) {
    console.error("DELETE /discussions/groups/:groupId/messages/:messageId failed", error);
    return res.status(500).json(apiErrorBody("Failed to delete message", null));
  }
});

router.get("/groups/:groupId/messages/:messageId/reactions", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const rows = await prisma.discussionMessageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, full_name: true } } },
      orderBy: { createdAt: "asc" },
    });
    const byEmoji = new Map();
    for (const r of rows) {
      if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
      byEmoji.get(r.emoji).push({
        userId: r.userId,
        full_name: r.user?.full_name ?? null,
        createdAt: r.createdAt,
      });
    }
    const results = [...byEmoji.entries()].map(([emoji, users]) => ({ emoji, users }));
    return res.json({ results });
  } catch (error) {
    console.error("GET reactions failed", error);
    return res.status(500).json(apiErrorBody("Failed to list reactions", null));
  }
});

router.post("/groups/:groupId/messages/:messageId/reactions", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    const parsed = reactionBodySchema.parse(req.body ?? {});
    await prisma.discussionMessageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: parsed.emoji,
        },
      },
      create: { messageId, userId, emoji: parsed.emoji },
      update: {},
    });
    const rows = await prisma.discussionMessageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, full_name: true } } },
    });
    const byEmoji = new Map();
    for (const r of rows) {
      if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
      byEmoji.get(r.emoji).push({ userId: r.userId, full_name: r.user?.full_name ?? null });
    }
    const summary = [...byEmoji.entries()].map(([emoji, users]) => ({ emoji, users }));
    const reactedMsg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId },
      select: { senderId: true },
    });
    const reactorRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true },
    });
    if (reactedMsg && reactedMsg.senderId !== userId) {
      await prisma.discussionNotification.create({
        data: {
          userId: reactedMsg.senderId,
          groupId,
          messageId,
          type: "REACTION",
          payload: {
            groupId,
            messageId,
            reactorId: userId,
            reactorName: reactorRow?.full_name ?? null,
            emoji: parsed.emoji,
          },
        },
      });
    }
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("reaction:update", {
        groupId,
        messageId,
        summary,
        emoji: parsed.emoji,
        userId,
        action: "add",
      });
    }
    return res.status(201).json({ ok: true, messageId, emoji: parsed.emoji, summary });
  } catch (error) {
    console.error("POST reaction failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to add reaction", null));
  }
});

router.delete("/groups/:groupId/messages/:messageId/reactions", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const messageId = Number(req.params.messageId);
    const userId = Number(req.user?.sub);
    const emoji = String(req.query.emoji ?? "").trim();
    if (!Number.isFinite(groupId) || !Number.isFinite(messageId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId or messageId", null));
    }
    if (!emoji) {
      return res.status(400).json(apiErrorBody("emoji query parameter is required", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const msg = await prisma.discussionMessage.findFirst({
      where: { id: messageId, groupId, deletedAt: null },
      select: { id: true },
    });
    if (!msg) return res.status(404).json(apiErrorBody("Message not found", null));
    await prisma.discussionMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    const rows = await prisma.discussionMessageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, full_name: true } } },
    });
    const byEmoji = new Map();
    for (const r of rows) {
      if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
      byEmoji.get(r.emoji).push({ userId: r.userId, full_name: r.user?.full_name ?? null });
    }
    const summary = [...byEmoji.entries()].map(([e, users]) => ({ emoji: e, users }));
    const io = getIo();
    if (io) {
      io.to(`discussion:group:${groupId}`).emit("reaction:update", {
        groupId,
        messageId,
        summary,
        emoji,
        userId,
        action: "remove",
      });
    }
    return res.json({ ok: true, messageId, emoji, summary });
  } catch (error) {
    console.error("DELETE reaction failed", error);
    return res.status(500).json(apiErrorBody("Failed to remove reaction", null));
  }
});

router.get("/me/notifications", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const parsed = notificationsQuerySchema.parse(req.query ?? {});
    const where = {
      userId,
      ...(parsed.unreadOnly ? { readAt: null } : {}),
      ...(parsed.groupId ? { groupId: parsed.groupId } : {}),
    };
    const notifications = await prisma.discussionNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parsed.limit,
    });
    const enriched = await enrichDiscussionNotificationsForApi(req, userId, notifications);
    return res.json({ results: enriched });
  } catch (error) {
    console.error("GET /discussions/me/notifications failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to fetch notifications", null));
  }
});

router.get("/me/notifications/unread-count", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const payload = await buildUnreadSocketPayload(userId);
    return res.json(payload);
  } catch (error) {
    console.error("GET /discussions/me/notifications/unread-count failed", error);
    return res.status(500).json(apiErrorBody("Failed to fetch unread counts", null));
  }
});

router.patch("/me/notifications/read", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const parsed = markReadSchema.parse(req.body ?? {});

    const where = { userId };
    if (parsed.notificationIds?.length) where.id = { in: parsed.notificationIds };
    if (parsed.groupId) where.groupId = parsed.groupId;
    if (parsed.groupDmId) {
      where.groupId = null;
      where.payload = { path: ["groupDmId"], equals: parsed.groupDmId };
    }
    if (parsed.upToCreatedAt) where.createdAt = { lte: new Date(parsed.upToCreatedAt) };
    if (
      parsed.markAll !== true &&
      !parsed.groupId &&
      !parsed.groupDmId &&
      !(parsed.notificationIds?.length)
    ) {
      return res
        .status(400)
        .json(apiErrorBody("Provide notificationIds, groupId, groupDmId, or markAll=true", null));
    }

    const result = await prisma.discussionNotification.updateMany({
      where: { ...where, readAt: null },
      data: { readAt: new Date() },
    });
    return res.json({ updatedCount: result.count });
  } catch (error) {
    console.error("PATCH /discussions/me/notifications/read failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to mark notifications as read", null));
  }
});

router.post("/me/e2e/devices", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const parsed = registerDeviceSchema.parse(req.body ?? {});
    const fingerprint = crypto
      .createHash("sha256")
      .update(`${parsed.algorithm}:${parsed.publicKey}`)
      .digest("hex");
    const row = await prisma.discussionDeviceKey.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: parsed.deviceId,
        },
      },
      create: {
        userId,
        deviceId: parsed.deviceId,
        publicKey: parsed.publicKey,
        algorithm: parsed.algorithm,
        fingerprint,
      },
      update: {
        publicKey: parsed.publicKey,
        algorithm: parsed.algorithm,
        fingerprint,
        revokedAt: null,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        deviceId: true,
        algorithm: true,
        fingerprint: true,
        createdAt: true,
      },
    });
    return res.status(201).json(row);
  } catch (error) {
    console.error("POST /discussions/me/e2e/devices failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to register device key", null));
  }
});

router.get("/groups/:groupId/e2e/keys", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    const deviceId = String(req.query?.deviceId || "");
    const fromVersion = req.query?.fromVersion ? Number(req.query.fromVersion) : null;
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    if (!deviceId) {
      return res.status(400).json(apiErrorBody("deviceId query param is required", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    const device = await prisma.discussionDeviceKey.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
      select: { userId: true, deviceId: true, revokedAt: true },
    });
    if (!device || device.revokedAt) {
      return res.status(403).json(apiErrorBody("Device key is not active", null));
    }

    const envelopes = await prisma.discussionGroupKeyEnvelope.findMany({
      where: {
        groupId,
        userId,
        deviceId,
        ...(Number.isFinite(fromVersion) ? { keyVersion: { gt: fromVersion } } : {}),
      },
      orderBy: [{ keyVersion: "asc" }, { createdAt: "asc" }],
    });
    return res.json({
      groupId,
      currentKeyVersion: membership.group?.e2eeCurrentKeyVersion ?? 1,
      rotationRequired: membership.group?.e2eeRotationRequired ?? false,
      envelopes,
    });
  } catch (error) {
    console.error("GET /discussions/groups/:groupId/e2e/keys failed", error);
    return res.status(500).json(apiErrorBody("Failed to fetch E2E keys", null));
  }
});

router.post("/groups/:groupId/e2e/epochs", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveMembership(groupId, userId);
    if (!membership) return res.status(403).json(apiErrorBody("Forbidden", null));
    if (!canManageGroup(membership)) {
      return res.status(403).json(apiErrorBody("Only moderators can publish group key epochs", null));
    }
    const parsed = publishEpochSchema.parse(req.body ?? {});

    const memberIds = await prisma.discussionGroupMembership.findMany({
      where: { groupId, leftAt: null, isActive: true },
      select: { userId: true },
    });
    const memberIdSet = new Set(memberIds.map((x) => Number(x.userId)));
    for (const env of parsed.envelopes) {
      if (!memberIdSet.has(Number(env.userId))) {
        return res
          .status(400)
          .json(apiErrorBody(`Envelope user ${env.userId} is not an active group member`, null));
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        parsed.envelopes.map((env) =>
          tx.discussionGroupKeyEnvelope.upsert({
            where: {
              groupId_keyVersion_userId_deviceId: {
                groupId,
                keyVersion: parsed.keyVersion,
                userId: env.userId,
                deviceId: env.deviceId,
              },
            },
            create: {
              groupId,
              keyVersion: parsed.keyVersion,
              userId: env.userId,
              deviceId: env.deviceId,
              encryptedKey: env.encryptedKey,
              nonce: env.nonce ?? null,
              algorithm: parsed.algorithm,
            },
            update: {
              encryptedKey: env.encryptedKey,
              nonce: env.nonce ?? null,
              algorithm: parsed.algorithm,
            },
          })
        )
      );

      await tx.discussionGroup.update({
        where: { id: groupId },
        data: {
          e2eeCurrentKeyVersion: parsed.keyVersion,
          e2eeRotationRequired: false,
        },
      });
      return created.length;
    });

    return res.status(201).json({
      groupId,
      keyVersion: parsed.keyVersion,
      publishedEnvelopes: result,
      rotationReason: parsed.rotationReason ?? null,
    });
  } catch (error) {
    console.error("POST /discussions/groups/:groupId/e2e/epochs failed", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: "error", message: "Validation failed", details: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to publish E2E key epoch", null));
  }
});

router.post(
  "/maintenance/notifications/archive",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const retentionDays = Math.min(
        90,
        Math.max(30, Number(req.body?.retentionDays ?? process.env.DISCUSSION_NOTIFICATION_RETENTION_DAYS ?? 60))
      );
      const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const result = await prisma.discussionNotification.deleteMany({
        where: {
          createdAt: { lt: threshold },
          readAt: { not: null },
        },
      });
      return res.json({
        archivedCount: result.count,
        retentionDays,
        threshold,
      });
    } catch (error) {
      console.error("POST /discussions/maintenance/notifications/archive failed", error);
      return res.status(500).json(apiErrorBody("Failed to archive notifications", null));
    }
  }
);

router.post(
  "/maintenance/attachments/cleanup-orphans",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const maxAgeHours = Math.max(1, Number(req.body?.maxAgeHours ?? 24));
      const threshold = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      const orphans = await prisma.discussionAttachment.findMany({
        where: {
          messageId: null,
          status: "PENDING",
          createdAt: { lt: threshold },
        },
        select: { id: true, storageKey: true },
        take: 2000,
      });
      let removedFiles = 0;
      for (const orphan of orphans) {
        if (orphan.storageKey) {
          const absolutePath = path.resolve(UPLOAD_DIR, orphan.storageKey);
          if (fs.existsSync(absolutePath)) {
            try {
              fs.unlinkSync(absolutePath);
              removedFiles += 1;
            } catch {}
          }
        }
      }
      const deleted = await prisma.discussionAttachment.deleteMany({
        where: { id: { in: orphans.map((x) => x.id) } },
      });
      return res.json({
        scanned: orphans.length,
        deletedRows: deleted.count,
        removedFiles,
        maxAgeHours,
      });
    } catch (error) {
      console.error("POST /discussions/maintenance/attachments/cleanup-orphans failed", error);
      return res.status(500).json(apiErrorBody("Failed to cleanup orphan attachments", null));
    }
  }
);

router.post(
  "/maintenance/attachments/archive-old",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const olderThanDays = Math.max(30, Number(req.body?.olderThanDays ?? 90));
      const threshold = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const result = await prisma.discussionAttachment.updateMany({
        where: {
          messageId: { not: null },
          status: { not: "ARCHIVED" },
          createdAt: { lt: threshold },
        },
        data: { status: "ARCHIVED" },
      });
      return res.json({
        archivedCount: result.count,
        olderThanDays,
      });
    } catch (error) {
      console.error("POST /discussions/maintenance/attachments/archive-old failed", error);
      return res.status(500).json(apiErrorBody("Failed to archive old attachments", null));
    }
  }
);

router.get(
  "/metrics",
  requireRole("SUPER_ADMIN"),
  async (_req, res) => {
    try {
      return res.json(getDiscussionMetricsSnapshot());
    } catch (error) {
      console.error("GET /discussions/metrics failed", error);
      return res.status(500).json(apiErrorBody("Failed to fetch discussion metrics", null));
    }
  }
);

router.post(
  "/maintenance/messages/archive-old",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const olderThanMonths = Math.max(12, Number(req.body?.olderThanMonths ?? 12));
      const threshold = new Date();
      threshold.setMonth(threshold.getMonth() - olderThanMonths);
      if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

      const rows = await prisma.discussionMessage.findMany({
        where: {
          createdAt: { lt: threshold },
          deletedAt: null,
        },
        include: {
          attachments: true,
        },
        orderBy: { createdAt: "asc" },
        take: Math.min(20000, Number(req.body?.limit ?? 5000)),
      });

      if (rows.length === 0) {
        return res.json({ archivedMessages: 0, threshold, file: null });
      }

      const fileName = `discussion-messages-${Date.now()}.jsonl`;
      const archivePath = path.resolve(ARCHIVE_DIR, fileName);
      const stream = fs.createWriteStream(archivePath, { flags: "a" });
      for (const row of rows) {
        stream.write(
          `${JSON.stringify({
            id: row.id,
            groupId: row.groupId,
            senderId: row.senderId,
            messageType: row.messageType,
            createdAt: row.createdAt,
            keyVersion: row.keyVersion,
            senderDeviceId: row.senderDeviceId,
            content: row.content,
            ciphertext: row.ciphertext,
            nonce: row.nonce,
            attachments: row.attachments.map((a) => ({
              id: a.id,
              fileType: a.fileType,
              mimeType: a.mimeType,
              size: Number(a.size),
              storageKey: a.storageKey,
              ciphertextHash: a.ciphertextHash,
              keyVersion: a.keyVersion,
            })),
          })}\n`
        );
      }
      await new Promise((resolve) => stream.end(resolve));

      const messageIds = rows.map((r) => r.id);
      const result = await prisma.discussionMessage.updateMany({
        where: { id: { in: messageIds } },
        data: {
          content: null,
          ciphertext: null,
          nonce: null,
          deletedAt: new Date(),
        },
      });
      metricCount("archive.messages_runs", 1);
      metricCount("archive.messages_count", result.count);

      return res.json({
        archivedMessages: result.count,
        threshold,
        file: archivePath,
      });
    } catch (error) {
      console.error("POST /discussions/maintenance/messages/archive-old failed", error);
      return res.status(500).json(apiErrorBody("Failed to archive old messages", null));
    }
  }
);

router.use(groupDmsRouter);
router.use(serversRouter);

export default router;
