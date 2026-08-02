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
  const groupIntIds = grouped.filter((row) => row.groupId != null).map((row) => Number(row.groupId));
  const groupRows = groupIntIds.length
    ? await prisma.discussionGroup.findMany({
        where: { id: { in: groupIntIds } },
        select: { id: true, publicId: true },
      })
    : [];
  const groupPublicIdById = new Map(groupRows.map((g) => [g.id, g.publicId]));
  const byGroup = grouped
    .filter((row) => row.groupId != null && groupPublicIdById.has(Number(row.groupId)))
    .map((row) => ({
      groupId: groupPublicIdById.get(Number(row.groupId)),
      unreadCount: Number(row._count.groupId),
    }));
  const gdmRows = await prisma.discussionNotification.findMany({
    where: { userId: uid, readAt: null, groupId: null },
    select: { payload: true },
  });
  const gdmMap = new Map();
  for (const row of gdmRows) {
    const p = row.payload && typeof row.payload === "object" ? row.payload : {};
    // `groupDmId` in a stored notification payload is the GroupDm UUID
    // publicId (see route-06.js / send-group-dm-message.js) — not numeric.
    const gid = typeof p.groupDmId === "string" ? p.groupDmId : null;
    if (!gid) continue;
    gdmMap.set(gid, (gdmMap.get(gid) ?? 0) + 1);
  }
  const byGroupDm = [...gdmMap.entries()].map(([groupDmId, unreadCount]) => ({
    groupDmId,
    unreadCount,
  }));
  return { globalUnread, byGroup, byGroupDm };
}
