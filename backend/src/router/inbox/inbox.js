import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { auth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildUnreadSocketPayload } from "../../services/discussions/buildUnreadPayload.js";
import { loadClubServersForUser, loadClubMetaByServerIds } from "../../controllers/inbox/loadClubServers.js";
import { buildGroupInboxRows } from "../../controllers/inbox/buildGroupInboxRows.js";
import { buildDmInboxRows } from "../../controllers/inbox/buildDmInboxRows.js";

/**
 * Unified inbox — groups + clubs + DMs, recency-sorted.
 * type: group | club | dm
 */
const router = Router();
router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = Number(req.user?.sub ?? req.user?.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const unread = await buildUnreadSocketPayload(userId);
    const unreadByGroup = new Map(unread.byGroup.map((r) => [r.groupId, r.unreadCount]));
    const unreadByGroupDm = new Map(unread.byGroupDm.map((r) => [r.groupDmId, r.unreadCount]));

    const [memberships, clubServers] = await Promise.all([
      prisma.discussionGroupMembership.findMany({
        where: { userId, leftAt: null, isActive: true, group: { status: "ACTIVE" } },
        take: 300,
        select: {
          group: {
            select: {
              id: true,
              name: true,
              iconUrl: true,
              kind: true,
              scopeType: true,
              defaultChannelId: true,
              parentServerId: true,
            },
          },
        },
      }),
      loadClubServersForUser(userId),
    ]);

    const groupsById = new Map();
    for (const m of memberships) {
      if (m.group) groupsById.set(m.group.id, m.group);
    }
    for (const club of clubServers) {
      const existing = groupsById.get(club.id);
      groupsById.set(club.id, existing ? { ...existing, ...club } : club);
    }
    const groups = [...groupsById.values()];
    const groupIds = groups.map((g) => g.id);

    const [dmRows, legacyChannelRows] = await Promise.all([
      prisma.groupDmMember.findMany({
        where: { userId, leftAt: null, groupDm: { archivedAt: null } },
        select: {
          groupDm: {
            select: {
              id: true,
              publicId: true,
              name: true,
              iconUrl: true,
              members: {
                where: { leftAt: null },
                select: {
                  userId: true,
                  user: { select: { id: true, full_name: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      }),
      groupIds.length
        ? prisma.discussionChannel.findMany({
            where: { legacyGroupId: { in: groupIds } },
            select: { id: true, legacyGroupId: true, serverId: true },
          })
        : Promise.resolve([]),
    ]);

    const dms = dmRows.map((r) => r.groupDm).filter(Boolean);
    const dmIds = dms.map((d) => d.id);
    const legacyChannelByGroup = new Map(
      legacyChannelRows.map((c) => [c.legacyGroupId, c])
    );

    const [lastGroup, lastDm] = await Promise.all([
      groupIds.length
        ? prisma.discussionMessage.findMany({
            where: { groupId: { in: groupIds }, deletedAt: null },
            orderBy: { createdAt: "desc" },
            distinct: ["groupId"],
            select: {
              groupId: true,
              content: true,
              createdAt: true,
              sender: { select: { full_name: true } },
            },
          })
        : Promise.resolve([]),
      dmIds.length
        ? prisma.discussionMessage.findMany({
            where: { groupDmId: { in: dmIds }, deletedAt: null },
            orderBy: { createdAt: "desc" },
            distinct: ["groupDmId"],
            select: {
              groupDmId: true,
              content: true,
              createdAt: true,
              sender: { select: { full_name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const clubMetaByServerId = await loadClubMetaByServerIds(groupIds);

    const rows = [
      ...buildGroupInboxRows({
        groups,
        lastByGroup: new Map(lastGroup.map((m) => [m.groupId, m])),
        unreadByGroup,
        legacyChannelByGroup,
        clubMetaByServerId,
      }),
      ...buildDmInboxRows({
        dms,
        userId,
        lastByDm: new Map(lastDm.map((m) => [m.groupDmId, m])),
        unreadByGroupDm,
      }),
    ];

    rows.sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (bt !== at) return bt - at;
      return String(a.title).localeCompare(String(b.title));
    });

    res.json({
      rows,
      totalUnread: rows.reduce((n, r) => n + (r.unreadCount ?? 0), 0),
    });
  })
);

export default router;
