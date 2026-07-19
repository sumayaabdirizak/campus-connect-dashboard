import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { auth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { buildUnreadSocketPayload } from "../../features/discussions/buildUnreadPayload.js";

/**
 * Unified inbox aggregator — the WhatsApp-style single list.
 *
 * READ-ONLY layer over the existing engines: it fans out to the same tables
 * the Discussions / Group-DM / Offices features already own and returns one
 * normalized, recency-sorted row list. It never writes and never changes
 * those engines — deleting this folder returns the app to exactly today.
 *
 * Row shape: { type, key, id, title, subtitle, preview, timestamp,
 *              unreadCount, href, badge }
 *   type: 'group' | 'dm' | 'office'
 */
const router = Router();
router.use(auth);

const PREVIEW_MAX = 120;
function preview(content) {
  if (!content) return "";
  const s = String(content).replace(/\s+/g, " ").trim();
  return s.length > PREVIEW_MAX ? `${s.slice(0, PREVIEW_MAX)}…` : s;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = Number(req.user.sub);

    const unread = await buildUnreadSocketPayload(userId);
    const unreadByGroup = new Map(unread.byGroup.map((r) => [r.groupId, r.unreadCount]));
    const unreadByGroupDm = new Map(unread.byGroupDm.map((r) => [r.groupDmId, r.unreadCount]));

    // ── My groups (faculty servers, section groups, clubs) ──────────────────
    const memberships = await prisma.discussionGroupMembership.findMany({
      where: { userId, leftAt: null, isActive: true, group: { status: "ACTIVE" } },
      select: {
        group: {
          select: { id: true, name: true, iconUrl: true, kind: true, defaultChannelId: true },
        },
      },
    });
    const groups = memberships.map((m) => m.group).filter(Boolean);
    const groupIds = groups.map((g) => g.id);

    // ── My group DMs + 1:1 DMs ──────────────────────────────────────────────
    const dmRows = await prisma.groupDmMember.findMany({
      where: { userId, leftAt: null, groupDm: { archivedAt: null } },
      select: {
        groupDm: {
          select: {
            id: true,
            name: true,
            members: {
              where: { leftAt: null },
              select: { userId: true, user: { select: { id: true, full_name: true } } },
            },
          },
        },
      },
    });
    const dms = dmRows.map((r) => r.groupDm).filter(Boolean);
    const dmIds = dms.map((d) => d.id);

    // ── My office conversations (student side) ──────────────────────────────
    const officeThreads = await prisma.officeThread.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        topic: true,
        reference: true,
        status: true,
        updatedAt: true,
        office: { select: { name: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    const officeThreadIds = officeThreads.map((t) => t.id);

    // ── Last message per conversation (one query each via distinct) ──────────
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
    const lastGroupMap = new Map(lastGroup.map((m) => [m.groupId, m]));
    const lastDmMap = new Map(lastDm.map((m) => [m.groupDmId, m]));
    const lastOfficeMap = new Map(lastOffice.map((m) => [m.officeThreadId, m]));

    const rows = [];

    for (const g of groups) {
      const last = lastGroupMap.get(g.id);
      const isClub = g.kind === "USER_SERVER";
      rows.push({
        type: "group",
        key: `group-${g.id}`,
        id: g.id,
        title: g.name,
        subtitle: isClub ? "Club" : "Faculty group",
        avatarUrl: g.iconUrl ?? null,
        preview: last
          ? `${last.sender?.full_name ? `${last.sender.full_name.split(" ")[0]}: ` : ""}${preview(last.content)}`
          : "",
        timestamp: (last?.createdAt ?? null),
        unreadCount: unreadByGroup.get(g.id) ?? 0,
        href: g.defaultChannelId
          ? `/dashboard/chat/${g.id}/${g.defaultChannelId}`
          : `/dashboard/chat/${g.id}`,
      });
    }

    for (const d of dms) {
      const others = d.members.filter((m) => Number(m.userId) !== userId).map((m) => m.user);
      const title = d.name?.trim() || others.map((u) => u?.full_name).filter(Boolean).join(", ") || "Direct message";
      const isOneToOne = d.members.length === 2;
      const last = lastDmMap.get(d.id);
      rows.push({
        type: "dm",
        key: `dm-${d.id}`,
        id: d.id,
        title,
        subtitle: isOneToOne ? null : `${d.members.length} members`,
        avatarUrl: null,
        preview: last
          ? `${last.sender?.full_name && !isOneToOne ? `${last.sender.full_name.split(" ")[0]}: ` : ""}${preview(last.content)}`
          : "",
        timestamp: (last?.createdAt ?? null),
        unreadCount: unreadByGroupDm.get(d.id) ?? 0,
        href: `/dashboard/chat/dm/${d.id}`,
      });
    }

    for (const t of officeThreads) {
      const last = lastOfficeMap.get(t.id);
      rows.push({
        type: "office",
        key: `office-${t.id}`,
        id: t.id,
        title: t.office?.name ?? "Office",
        subtitle: `${t.topic} · ${t.reference}`,
        avatarUrl: null,
        preview: preview(last?.content) || t.topic,
        timestamp: (last?.createdAt ?? t.updatedAt),
        // Offices have no per-user read marker yet — AWAITING_STUDENT means the
        // office replied and it's the student's turn, so surface it as unread.
        unreadCount: t.status === "AWAITING_STUDENT" ? 1 : 0,
        badge: t.status,
        href: `/dashboard/offices?thread=${t.id}`,
      });
    }

    // Recency sort: newest activity first; rows without a timestamp sink.
    rows.sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bt - at;
    });

    res.json({
      rows,
      totalUnread: rows.reduce((n, r) => n + (r.unreadCount ?? 0), 0),
    });
  })
);

export default router;
