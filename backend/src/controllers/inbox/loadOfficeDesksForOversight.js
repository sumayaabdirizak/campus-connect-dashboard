import { prisma } from '../../db/prisma.js';
import { isOfficeInboxOversight } from '../../../../shared/roles.js';
import { countOfficeThreadUnreads } from '../../services/offices/officeThreadRead.js';

/**
 * Active desks for oversight, each with optional DM thread preview (AO ↔ office).
 */
export async function loadOfficeDesksForOversight(platformRole, userId) {
  if (!isOfficeInboxOversight(platformRole)) return [];

  const offices = await prisma.supportOffice.findMany({
    where: { isActive: true },
    orderBy: [{ facultyId: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      facultyId: true,
      faculty: { select: { id: true, name: true, code: true } },
    },
  });

  if (!offices.length || !Number.isFinite(userId) || userId <= 0) {
    return offices.map((o) => ({
      ...o,
      dmThread: null,
      lastMessage: null,
      unreadCount: 0,
    }));
  }

  const officeIds = offices.map((o) => o.id);
  const threads = await prisma.officeThread.findMany({
    where: { studentId: userId, officeId: { in: officeIds } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      officeId: true,
      updatedAt: true,
      topic: true,
      status: true,
    },
  });

  const threadByOffice = new Map();
  for (const t of threads) {
    if (!threadByOffice.has(t.officeId)) threadByOffice.set(t.officeId, t);
  }

  const threadIds = [...threadByOffice.values()].map((t) => t.id);
  const [lastMsgs, unreadByThread] = await Promise.all([
    threadIds.length === 0
      ? Promise.resolve([])
      : prisma.discussionMessage.findMany({
          where: {
            officeThreadId: { in: threadIds },
            isInternalNote: false,
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          distinct: ['officeThreadId'],
          select: {
            officeThreadId: true,
            content: true,
            createdAt: true,
          },
        }),
    countOfficeThreadUnreads(userId, threadIds),
  ]);
  const lastByThread = new Map(lastMsgs.map((m) => [m.officeThreadId, m]));

  return offices.map((o) => {
    const dm = threadByOffice.get(o.id) ?? null;
    return {
      ...o,
      dmThread: dm,
      lastMessage: dm ? lastByThread.get(dm.id) ?? null : null,
      unreadCount: dm ? unreadByThread.get(dm.id) ?? 0 : 0,
    };
  });
}
