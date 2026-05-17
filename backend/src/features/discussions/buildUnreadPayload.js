import { prisma } from "../../db/prisma.js";

/**
 * Full unread summary for Socket / REST (groups + group DMs).
 */
export async function buildUnreadSocketPayload(userId) {
  const uid = Number(userId);
  const globalUnread = await prisma.discussionNotification.count({
    where: { userId: uid, readAt: null },
  });
  const grouped = await prisma.discussionNotification.groupBy({
    by: ["groupId"],
    where: { userId: uid, readAt: null },
    _count: { groupId: true },
  });
  const byGroup = grouped
    .filter((row) => row.groupId != null)
    .map((row) => ({ groupId: Number(row.groupId), unreadCount: Number(row._count.groupId) }));
  const gdmRows = await prisma.discussionNotification.findMany({
    where: { userId: uid, readAt: null, groupId: null },
    select: { payload: true },
  });
  const gdmMap = new Map();
  for (const row of gdmRows) {
    const p = row.payload && typeof row.payload === "object" ? row.payload : {};
    const gid = Number(p.groupDmId);
    if (!Number.isFinite(gid) || gid <= 0) continue;
    gdmMap.set(gid, (gdmMap.get(gid) ?? 0) + 1);
  }
  const byGroupDm = [...gdmMap.entries()].map(([groupDmId, unreadCount]) => ({
    groupDmId,
    unreadCount,
  }));
  return { globalUnread, byGroup, byGroupDm };
}
