/**
 * Collect distinct sender ids for a thread (root + all descendants), excluding `excludeUserId`.
 * Legacy groups: channelId is null; hybrid channels: pass channelId + serverId as groupId.
 */
export async function collectThreadParticipantSenderIds(tx, { groupId, channelId, rootMessageId, excludeUserId }) {
  const senders = new Set();
  const rootWhere =
    channelId != null && Number.isFinite(Number(channelId))
      ? {
          id: rootMessageId,
          groupId,
          channelId,
          deletedAt: null,
        }
      : {
          id: rootMessageId,
          groupId,
          channelId: null,
          deletedAt: null,
        };

  const rootRow = await tx.discussionMessage.findFirst({
    where: rootWhere,
    select: { senderId: true },
  });
  if (rootRow) senders.add(Number(rootRow.senderId));

  let frontier = [rootMessageId];
  const visited = new Set(frontier);

  while (frontier.length > 0) {
    const parentWhere =
      channelId != null && Number.isFinite(Number(channelId))
        ? {
            groupId,
            channelId,
            deletedAt: null,
            parentMessageId: { in: frontier },
          }
        : {
            groupId,
            channelId: null,
            deletedAt: null,
            parentMessageId: { in: frontier },
          };

    const children = await tx.discussionMessage.findMany({
      where: parentWhere,
      select: { id: true, senderId: true },
    });

    frontier = [];
    for (const m of children) {
      senders.add(Number(m.senderId));
      const mid = Number(m.id);
      if (!visited.has(mid)) {
        visited.add(mid);
        frontier.push(mid);
      }
    }
  }

  senders.delete(Number(excludeUserId));
  return [...senders];
}

export async function resolveThreadRootMessageId(tx, { groupId, channelId, replyParentMessageId }) {
  let cur = replyParentMessageId;
  for (let i = 0; i < 60; i++) {
    const baseWhere =
      channelId != null && Number.isFinite(Number(channelId))
        ? { id: cur, groupId, channelId, deletedAt: null }
        : { id: cur, groupId, channelId: null, deletedAt: null };

    const row = await tx.discussionMessage.findFirst({
      where: baseWhere,
      select: { id: true, parentMessageId: true },
    });
    if (!row) return null;
    if (row.parentMessageId == null) return Number(row.id);
    cur = Number(row.parentMessageId);
  }
  return null;
}
