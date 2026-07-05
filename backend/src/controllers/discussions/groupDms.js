/**
 * Group DMs (3–10 members, no 1:1). Mounted at `/api/discussions`.
 */

import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import { buildUnreadSocketPayload } from "../../features/discussions/buildUnreadPayload.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../features/discussions/discussionPagination.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";
import {
  createGroupDmSchema,
  groupDmSendMessageSchema,
  addGroupDmMembersSchema,
} from "../../features/discussions/validation/groupDiscussionSchemas.js";

const router = express.Router();
const MIN_TOTAL_MEMBERS = 3;
const MAX_TOTAL_MEMBERS = 10;

async function getActiveMember(groupDmId, userId) {
  return prisma.groupDmMember.findFirst({
    where: { groupDmId, userId, leftAt: null },
    include: { groupDm: { select: { id: true, archivedAt: true } } },
  });
}

/** People who share a discussion server with you (for picking group DM members). Must stay before `/group-dms/:groupDmId`. */
router.get("/group-dms/member-candidates", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const q = String(req.query.q ?? "")
      .trim()
      .slice(0, 80);

    const myServers = await prisma.discussionGroupMembership.findMany({
      where: {
        userId,
        leftAt: null,
        isActive: true,
        group: { status: "ACTIVE", kind: { in: ["FACULTY_SERVER", "USER_SERVER"] } },
      },
      select: { groupId: true },
    });
    const serverIds = [...new Set(myServers.map((x) => x.groupId))];
    if (serverIds.length === 0) return res.json({ results: [] });

    const memberRows = await prisma.discussionGroupMembership.findMany({
      where: {
        groupId: { in: serverIds },
        leftAt: null,
        isActive: true,
        userId: { not: userId },
        user: {
          status: "ACTIVE",
          ...(q
            ? {
                OR: [
                  { full_name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      },
      select: {
        userId: true,
        user: { select: { id: true, full_name: true, email: true } },
      },
      take: 80,
      orderBy: { joinedAt: "desc" },
    });

    const seen = new Set();
    const results = [];
    for (const row of memberRows) {
      const uid = Number(row.userId);
      if (seen.has(uid)) continue;
      seen.add(uid);
      if (row.user) results.push(row.user);
      if (results.length >= 25) break;
    }
    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/group-dms/member-candidates failed", error);
    return res.status(500).json(apiErrorBody("Failed to load candidates", null));
  }
});

router.get("/group-dms", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

    const rows = await prisma.groupDmMember.findMany({
      where: { userId, leftAt: null, groupDm: { archivedAt: null } },
      include: {
        groupDm: {
          include: {
            members: {
              where: { leftAt: null },
              take: 8,
              include: { user: { select: { id: true, full_name: true } } },
            },
            messages: {
              take: 1,
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              where: { deletedAt: null },
              include: { sender: { select: { id: true, full_name: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const results = rows.map((r) => {
      const g = r.groupDm;
      const last = g.messages?.[0] ?? null;
      return {
        id: g.id,
        name: g.name,
        iconUrl: g.iconUrl,
        createdAt: g.createdAt,
        memberCount: g.members?.length ?? 0,
        previewMembers: (g.members || []).map((m) => ({
          id: m.user.id,
          full_name: m.user.full_name,
        })),
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              ciphertext: last.ciphertext,
              messageType: last.messageType,
              createdAt: last.createdAt,
              sender: last.sender,
            }
          : null,
        myRole: r.role,
      };
    });

    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/group-dms failed", error);
    return res.status(500).json(apiErrorBody("Failed to list group DMs", null));
  }
});

router.post("/group-dms", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));

    const parsed = createGroupDmSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
    }
    const { name, memberUserIds } = parsed.data;
    const unique = new Set([userId, ...memberUserIds]);
    if (unique.size < MIN_TOTAL_MEMBERS) {
      return res.status(400).json(
        apiErrorBody(`At least ${MIN_TOTAL_MEMBERS} distinct members are required`, {
          code: "GROUP_DM_MIN_MEMBERS",
        })
      );
    }
    if (unique.size > MAX_TOTAL_MEMBERS) {
      return res.status(400).json(
        apiErrorBody(`At most ${MAX_TOTAL_MEMBERS} members are allowed`, { code: "GROUP_DM_MAX_MEMBERS" })
      );
    }

    const users = await prisma.user.findMany({
      where: { id: { in: [...unique] }, status: "ACTIVE" },
      select: { id: true },
    });
    if (users.length !== unique.size) {
      return res.status(400).json(apiErrorBody("One or more users are invalid or inactive", null));
    }

    const created = await prisma.$transaction(async (tx) => {
      const gd = await tx.groupDm.create({
        data: {
          name: name?.trim() || null,
          createdById: userId,
        },
      });
      for (const uid of unique) {
        await tx.groupDmMember.create({
          data: {
            groupDmId: gd.id,
            userId: uid,
            role: uid === userId ? "OWNER" : "MEMBER",
            canPost: true,
          },
        });
      }
      return tx.groupDm.findUnique({
        where: { id: gd.id },
        include: {
          members: {
            where: { leftAt: null },
            include: { user: { select: { id: true, full_name: true, email: true } } },
          },
        },
      });
    });

    try {
      const io = getIo();
      if (io && created) {
        for (const uid of unique) {
          io.to(`user:${uid}`).emit("groupdm:new", { groupDm: created });
        }
      }
    } catch (e) {
      console.warn("groupdm:new socket emit failed", e?.message);
    }

    return res.status(201).json({ groupDm: created });
  } catch (error) {
    console.error("POST /discussions/group-dms failed", error);
    return res.status(500).json(apiErrorBody("Failed to create group DM", null));
  }
});

router.get("/group-dms/:groupDmId", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const groupDmId = Number(req.params.groupDmId);
    if (!Number.isInteger(groupDmId) || groupDmId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid groupDmId", null));
    }
    const member = await getActiveMember(groupDmId, userId);
    if (!member?.groupDm || member.groupDm.archivedAt) {
      return res.status(404).json(apiErrorBody("Group DM not found", null));
    }

    const groupDm = await prisma.groupDm.findUnique({
      where: { id: groupDmId },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: { id: true, full_name: true, email: true } } },
        },
      },
    });
    return res.json({ groupDm, myRole: member.role });
  } catch (error) {
    console.error("GET /discussions/group-dms/:id failed", error);
    return res.status(500).json(apiErrorBody("Failed to load group DM", null));
  }
});

router.get("/group-dms/:groupDmId/messages", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const groupDmId = Number(req.params.groupDmId);
    if (!Number.isInteger(groupDmId) || groupDmId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid groupDmId", null));
    }
    const member = await getActiveMember(groupDmId, userId);
    if (!member?.groupDm || member.groupDm.archivedAt) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }

    const limit = parseDiscussionHistoryLimit(req.query.limit);
    const cursor = decodeDiscussionCursor(req.query.cursor);
    const where = {
      groupDmId,
      deletedAt: null,
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
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
        reactions: { include: { user: { select: { id: true, full_name: true } } } },
      },
    });

    const hasMore = messages.length > limit;
    const pageRows = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor =
      hasMore && pageRows.length
        ? encodeDiscussionCursor(pageRows[pageRows.length - 1].createdAt, pageRows[pageRows.length - 1].id)
        : null;

    return res.json({
      results: pageRows.reverse(),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("GET /discussions/group-dms/:id/messages failed", error);
    return res.status(500).json(apiErrorBody("Failed to load messages", null));
  }
});

router.post("/group-dms/:groupDmId/messages", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const groupDmId = Number(req.params.groupDmId);
    if (!Number.isInteger(groupDmId) || groupDmId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid groupDmId", null));
    }
    const member = await getActiveMember(groupDmId, userId);
    if (!member?.groupDm || member.groupDm.archivedAt) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }
    if (!member.canPost) {
      return res.status(403).json(apiErrorBody("Posting is disabled for you in this group DM", null));
    }

    const parsed = groupDmSendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
    }
    const body = parsed.data;
    const text = body.content?.trim() || "";
    if (!text && body.messageType !== "MEDIA") {
      return res.status(400).json(apiErrorBody("content is required", null));
    }

    const message = await prisma.discussionMessage.create({
      data: {
        groupId: null,
        channelId: null,
        groupDmId,
        senderId: userId,
        content: text || null,
        messageType: body.messageType,
        parentMessageId: body.parentMessageId ?? null,
      },
      include: {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
        reactions: true,
      },
    });

    const others = await prisma.groupDmMember.findMany({
      where: { groupDmId, userId: { not: userId }, leftAt: null },
      select: { userId: true },
    });
    const otherIds = others.map((o) => Number(o.userId));
    if (otherIds.length > 0) {
      await prisma.discussionNotification.createMany({
        data: otherIds.map((uid) => ({
          userId: uid,
          groupId: null,
          messageId: message.id,
          type: "MESSAGE",
          payload: {
            groupDmId,
            messageId: message.id,
            senderId: userId,
            senderName: message.sender?.full_name ?? null,
          },
        })),
      });
    }

    const out = { ...message, groupDmId };
    try {
      const io = getIo();
      if (io) {
        io.to(`groupdm:${groupDmId}`).emit("message:new", out);
        io.to(`groupdm:${groupDmId}`).emit("groupdm:message:new", out);
        for (const uid of otherIds) {
          const unreadPayload = await buildUnreadSocketPayload(uid);
          io.to(`user:${uid}`).emit("unread:update", unreadPayload);
        }
      }
    } catch (e) {
      console.warn("groupdm message socket emit failed", e?.message);
    }

    return res.status(201).json({ message: out });
  } catch (error) {
    console.error("POST /discussions/group-dms/:id/messages failed", error);
    return res.status(500).json(apiErrorBody("Failed to send message", null));
  }
});

router.post("/group-dms/:groupDmId/members", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const groupDmId = Number(req.params.groupDmId);
    const parsed = addGroupDmMembersSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody("Invalid request body", parsed.error.issues));
    }

    const member = await getActiveMember(groupDmId, userId);
    if (!member?.groupDm || member.groupDm.archivedAt) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }

    const currentCount = await prisma.groupDmMember.count({
      where: { groupDmId, leftAt: null },
    });
    const newIds = parsed.data.userIds.filter((id) => id !== userId);
    if (currentCount + newIds.length > MAX_TOTAL_MEMBERS) {
      return res.status(400).json(apiErrorBody("Member limit exceeded", null));
    }

    const users = await prisma.user.findMany({
      where: { id: { in: newIds }, status: "ACTIVE" },
      select: { id: true },
    });
    if (users.length !== new Set(newIds).size) {
      return res.status(400).json(apiErrorBody("Invalid user ids", null));
    }

    for (const uid of new Set(newIds)) {
      await prisma.groupDmMember.upsert({
        where: { groupDmId_userId: { groupDmId, userId: uid } },
        create: { groupDmId, userId: uid, role: "MEMBER", canPost: true },
        update: { leftAt: null, role: "MEMBER" },
      });
    }

    const updated = await prisma.groupDm.findUnique({
      where: { id: groupDmId },
      include: {
        members: { where: { leftAt: null }, include: { user: { select: { id: true, full_name: true } } } },
      },
    });

    try {
      const io = getIo();
      if (io) {
        io.to(`groupdm:${groupDmId}`).emit("groupdm:member:add", { groupDmId, groupDm: updated });
      }
    } catch (e) {
      console.warn("groupdm member socket emit failed", e?.message);
    }

    return res.json({ groupDm: updated });
  } catch (error) {
    console.error("POST /discussions/group-dms/:id/members failed", error);
    return res.status(500).json(apiErrorBody("Failed to add members", null));
  }
});

router.delete("/group-dms/:groupDmId/members/:targetUserId", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const groupDmId = Number(req.params.groupDmId);
    const targetUserId = Number(req.params.targetUserId);

    const self = await getActiveMember(groupDmId, userId);
    if (!self?.groupDm || self.groupDm.archivedAt) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }

    const isSelf = targetUserId === userId;
    const isOwner = self.role === "OWNER";
    if (!isSelf && !isOwner) {
      return res.status(403).json(apiErrorBody("Only the owner can remove others", null));
    }

    await prisma.groupDmMember.updateMany({
      where: { groupDmId, userId: targetUserId, leftAt: null },
      data: { leftAt: new Date() },
    });

    const remaining = await prisma.groupDmMember.count({
      where: { groupDmId, leftAt: null },
    });
    if (remaining < 2) {
      await prisma.groupDm.update({
        where: { id: groupDmId },
        data: { archivedAt: new Date() },
      });
    } else {
      const activeOwner = await prisma.groupDmMember.findFirst({
        where: { groupDmId, role: "OWNER", leftAt: null },
      });
      if (!activeOwner) {
        const next = await prisma.groupDmMember.findFirst({
          where: { groupDmId, leftAt: null },
          orderBy: { joinedAt: "asc" },
        });
        if (next) {
          await prisma.groupDmMember.update({
            where: { id: next.id },
            data: { role: "OWNER" },
          });
        }
      }
    }

    try {
      const io = getIo();
      if (io) {
        io.to(`groupdm:${groupDmId}`).emit("groupdm:member:remove", { groupDmId, userId: targetUserId });
      }
    } catch (e) {
      console.warn("groupdm remove socket emit failed", e?.message);
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("DELETE /discussions/group-dms/:id/members/:uid failed", error);
    return res.status(500).json(apiErrorBody("Failed to update membership", null));
  }
});

/**
 * Self-leave (B2). Any active member can call this to exit a group DM.
 *
 *   POST /group-dms/:groupDmId/leave
 *
 * Behavior:
 *   - Soft-deletes the caller's own membership row (sets `leftAt`).
 *   - If the caller was OWNER and others remain, the oldest-joined remaining
 *     member is promoted to OWNER (`role = 'OWNER'`).
 *   - If no members remain, the DM itself is archived (`archivedAt = now()`).
 *   - Emits `groupdm:member:leave` to the DM room AND the leaver's personal
 *     `user:<id>` room, so other devices of the same user can react.
 *
 * Idempotent: a second call from the same user returns 404 because they're
 * no longer an active member.
 */
router.post("/group-dms/:groupDmId/leave", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const groupDmId = Number(req.params.groupDmId);
    if (!Number.isInteger(groupDmId) || groupDmId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid groupDmId", null));
    }

    const self = await getActiveMember(groupDmId, userId);
    if (!self?.groupDm || self.groupDm.archivedAt) {
      return res.status(404).json(apiErrorBody("Group DM not found", null));
    }

    const wasOwner = self.role === "OWNER";
    let archived = false;
    let newOwnerId = null;

    await prisma.$transaction(async (tx) => {
      await tx.groupDmMember.updateMany({
        where: { groupDmId, userId, leftAt: null },
        data: { leftAt: new Date() },
      });
      const remaining = await tx.groupDmMember.findMany({
        where: { groupDmId, leftAt: null },
        orderBy: { joinedAt: "asc" },
        take: 1,
      });
      if (remaining.length === 0) {
        await tx.groupDm.update({
          where: { id: groupDmId },
          data: { archivedAt: new Date() },
        });
        archived = true;
      } else if (wasOwner) {
        const heir = remaining[0];
        await tx.groupDmMember.update({
          where: { id: heir.id },
          data: { role: "OWNER" },
        });
        newOwnerId = Number(heir.userId);
      }
    });

    try {
      const io = getIo();
      if (io) {
        const payload = { groupDmId, userId, archived, newOwnerId };
        io.to(`groupdm:${groupDmId}`).emit("groupdm:member:leave", payload);
        io.to(`user:${userId}`).emit("groupdm:member:leave", payload);
      }
    } catch (e) {
      console.warn("groupdm leave socket emit failed", e?.message);
    }

    return res.json({ ok: true, archived, newOwnerId });
  } catch (error) {
    console.error("POST /discussions/group-dms/:id/leave failed", error);
    return res.status(500).json(apiErrorBody("Failed to leave group DM", null));
  }
});

/**
 * Initial state for DM read receipts. Returns the latest message id each
 * member has read (within this DM). Lets the frontend seed its receipt map
 * on mount instead of waiting for a fresh socket event.
 */
router.get("/group-dms/:groupDmId/receipts", async (req, res) => {
  try {
    const userId = getDiscussionCallerUserId(req);
    if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
    const groupDmId = Number(req.params.groupDmId);
    if (!Number.isInteger(groupDmId) || groupDmId <= 0) {
      return res.status(400).json(apiErrorBody("Invalid groupDmId", null));
    }
    const member = await getActiveMember(groupDmId, userId);
    if (!member?.groupDm || member.groupDm.archivedAt) {
      return res.status(403).json(apiErrorBody("Forbidden", null));
    }

    // Receipts for any message in this DM, sorted so the highest messageId
    // per user comes first. We then dedupe by userId in memory — small
    // payload (one row per member at most).
    const rows = await prisma.discussionReadReceipt.findMany({
      where: { message: { groupDmId } },
      select: { userId: true, messageId: true, readAt: true },
      orderBy: [{ messageId: "desc" }],
    });
    const seen = new Set();
    const results = [];
    for (const r of rows) {
      const uid = Number(r.userId);
      if (seen.has(uid)) continue;
      seen.add(uid);
      results.push({
        userId: uid,
        messageId: Number(r.messageId),
        readAt: r.readAt.toISOString(),
      });
    }
    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/group-dms/:id/receipts failed", error);
    return res.status(500).json(apiErrorBody("Failed to load receipts", null));
  }
});

export default router;
