import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { requireActiveDiscussionMembership } from "../../features/discussions/discussionMembership.js";
import { computeMemberPresence } from "../../features/discussions/discussionPresence.js";
import { isDiscussionQaChannelNameKey } from "../../features/discussions/discussionMessagePublic.js";

const router = express.Router();

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

router.get("/groups/:groupId/members", async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(groupId)) {
      return res.status(400).json(apiErrorBody("Invalid groupId", null));
    }
    const membership = await requireActiveDiscussionMembership(groupId, userId);
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
    const membership = await requireActiveDiscussionMembership(groupId, userId);
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
export default router;
