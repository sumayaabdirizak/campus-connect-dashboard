import { prisma } from '../../db/prisma.js';

/** Mark an office thread as read for this user (opens chat). */
export async function markOfficeThreadRead(userId, threadId) {
  const uid = Number(userId);
  const tid = Number(threadId);
  if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(tid) || tid <= 0) return;

  await prisma.officeThreadRead.upsert({
    where: { threadId_userId: { threadId: tid, userId: uid } },
    create: { threadId: tid, userId: uid, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

/**
 * Unread public messages from others, per thread.
 * @param {number} userId
 * @param {number[]} threadIds
 * @returns {Promise<Map<number, number>>}
 */
export async function countOfficeThreadUnreads(userId, threadIds) {
  const uid = Number(userId);
  const ids = [...new Set(threadIds.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  const map = new Map(ids.map((id) => [id, 0]));
  if (!Number.isFinite(uid) || uid <= 0 || ids.length === 0) return map;

  const [reads, messages] = await Promise.all([
    prisma.officeThreadRead.findMany({
      where: { userId: uid, threadId: { in: ids } },
      select: { threadId: true, lastReadAt: true },
    }),
    prisma.discussionMessage.findMany({
      where: {
        officeThreadId: { in: ids },
        deletedAt: null,
        isInternalNote: false,
        senderId: { not: uid },
      },
      select: { officeThreadId: true, createdAt: true },
    }),
  ]);

  const sinceByThread = new Map(reads.map((r) => [r.threadId, r.lastReadAt]));
  for (const m of messages) {
    const tid = m.officeThreadId;
    if (tid == null) continue;
    const since = sinceByThread.get(tid);
    if (since && m.createdAt <= since) continue;
    map.set(tid, (map.get(tid) ?? 0) + 1);
  }
  return map;
}
