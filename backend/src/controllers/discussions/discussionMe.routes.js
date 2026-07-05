import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { buildUnreadSocketPayload } from "../../features/discussions/buildUnreadPayload.js";
import { enrichDiscussionNotificationsForApi } from "../../features/discussions/enrichDiscussionNotifications.js";
import { requireActiveDiscussionMembership } from "../../features/discussions/discussionMembership.js";
import { loadUserAnnouncementScope } from "../../utils/userAnnouncementScope.js";
import {
  muteBodySchema,
  markReadSchema,
  notificationsQuerySchema,
  registerDeviceSchema,
  patchDiscussionMeStatusSchema,
} from "../../features/discussions/validation/groupDiscussionSchemas.js";

const router = express.Router();

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
    const membership = await requireActiveDiscussionMembership(groupId, userId);
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
    const membership = await requireActiveDiscussionMembership(groupId, userId);
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
export default router;
