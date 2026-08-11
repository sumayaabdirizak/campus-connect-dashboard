import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { auth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildUnreadSocketPayload } from "../../services/discussions/buildUnreadPayload.js";
import { loadClubServersForUser, loadClubMetaByServerIds } from "../../controllers/inbox/loadClubServers.js";
import { buildGroupInboxRows } from "../../controllers/inbox/buildGroupInboxRows.js";
import { buildDmInboxRows } from "../../controllers/inbox/buildDmInboxRows.js";
import { buildOfficeInboxRows } from "../../controllers/inbox/buildOfficeInboxRows.js";
import { buildOfficeDeskInboxRows } from "../../controllers/inbox/buildOfficeDeskInboxRows.js";
import { loadOfficeThreadsForUser } from "../../controllers/inbox/loadOfficeThreadsForUser.js";
import { loadOfficeDesksForOversight } from "../../controllers/inbox/loadOfficeDesksForOversight.js";
import {
  isOfficeInboxOversight,
  isOfficeMessagesOnlyRole,
} from "../../../../shared/roles.js";
import { countOfficeThreadUnreads } from "../../services/offices/officeThreadRead.js";

/**
 * Unified inbox — groups + clubs + DMs + offices, recency-sorted.
 * Oversight (ACADEMIC_OFFICE / SUPER_ADMIN): office desks only (no thread rows).
 * ACADEMIC_OFFICE: no group/club rows (offices + DMs only).
 * type: group | club | dm | office
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
    const oversight = isOfficeInboxOversight(req.user?.role);
    const officeMessagesOnly = isOfficeMessagesOnlyRole(req.user?.role);

    const [memberships, clubServers] = officeMessagesOnly
      ? [[], []]
      : await Promise.all([
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

    const [dmRows, officeThreads, officeDesks, legacyChannelRows] = await Promise.all([
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
      // Oversight sees desks only in the list; threads open inside each desk hub.
      oversight ? Promise.resolve([]) : loadOfficeThreadsForUser(userId, req.user?.role),
      loadOfficeDesksForOversight(req.user?.role, userId),
      groupIds.length
        ? prisma.discussionChannel.findMany({
            where: { legacyGroupId: { in: groupIds } },
            select: { id: true, legacyGroupId: true, serverId: true },
          })
        : Promise.resolve([]),
    ]);

    const dms = dmRows.map((r) => r.groupDm).filter(Boolean);
    const dmIds = dms.map((d) => d.id);
    const officeThreadIds = officeThreads.map((t) => t.id);
    const legacyChannelByGroup = new Map(
      legacyChannelRows.map((c) => [c.legacyGroupId, c])
    );

    const [lastGroup, lastDm, lastOffice] = await Promise.all([
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
      officeThreadIds.length
        ? prisma.discussionMessage.findMany({
            where: {
              officeThreadId: { in: officeThreadIds },
              deletedAt: null,
              isInternalNote: false,
            },
            orderBy: { createdAt: "desc" },
            distinct: ["officeThreadId"],
            select: { officeThreadId: true, content: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const clubMetaByServerId = await loadClubMetaByServerIds(groupIds);
    const unreadByOffice = oversight
      ? new Map()
      : await countOfficeThreadUnreads(userId, officeThreadIds);

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
      ...buildOfficeDeskInboxRows(officeDesks),
      ...(oversight
        ? []
        : buildOfficeInboxRows({
            officeThreads,
            lastByOffice: new Map(lastOffice.map((m) => [m.officeThreadId, m])),
            unreadByOffice,
          })),
    ];

    rows.sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (bt !== at) return bt - at;
      if (a.officeKind === "desk" && b.officeKind !== "desk") return -1;
      if (b.officeKind === "desk" && a.officeKind !== "desk") return 1;
      return String(a.title).localeCompare(String(b.title));
    });

    res.json({
      rows,
      totalUnread: rows.reduce((n, r) => n + (r.unreadCount ?? 0), 0),
    });
  })
);

export default router;
