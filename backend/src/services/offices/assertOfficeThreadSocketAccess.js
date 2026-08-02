import { prisma } from '../../db/prisma.js';
import { isOfficeInboxOversight } from '../../../../shared/roles.js';

/**
 * @param {number} userId
 * @param {string|undefined} platformRole
 * @param {number} threadId
 * @returns {Promise<{ id: number, officeId: number, studentId: number } | null>}
 */
export async function assertOfficeThreadSocketAccess(userId, platformRole, threadId) {
  const tid = Number(threadId);
  const uid = Number(userId);
  if (!Number.isFinite(tid) || tid <= 0 || !Number.isFinite(uid) || uid <= 0) return null;

  const thread = await prisma.officeThread.findUnique({
    where: { id: tid },
    select: { id: true, officeId: true, studentId: true },
  });
  if (!thread) return null;
  if (thread.studentId === uid) return thread;
  if (isOfficeInboxOversight(platformRole)) return thread;

  const staff = await prisma.supportOfficeStaff.findUnique({
    where: { officeId_userId: { officeId: thread.officeId, userId: uid } },
    select: { id: true },
  });
  return staff ? thread : null;
}
