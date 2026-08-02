import { prisma } from '../../db/prisma.js';
import { getIo } from '../../socket/hub.js';

/**
 * Notify initiator + office staff that a public office message arrived.
 * Relies on sockets already joining `user:{id}` (discussions handler).
 */
export async function emitOfficeMessageNew({ thread, message }) {
  const io = getIo();
  if (!io || !thread?.id || !message) return;
  if (message.isInternalNote) return;

  const officeId = Number(thread.officeId);
  const studentId = Number(thread.studentId);
  const payload = {
    threadId: Number(thread.id),
    officeId: Number.isFinite(officeId) ? officeId : null,
    officeSlug: thread.office?.slug ?? null,
    message,
  };

  const recipientIds = new Set();
  if (Number.isFinite(studentId) && studentId > 0) recipientIds.add(studentId);

  if (Number.isFinite(officeId) && officeId > 0) {
    const staff = await prisma.supportOfficeStaff.findMany({
      where: { officeId },
      select: { userId: true },
    });
    for (const row of staff) {
      const uid = Number(row.userId);
      if (Number.isFinite(uid) && uid > 0) recipientIds.add(uid);
    }
  }

  for (const uid of recipientIds) {
    io.to(`user:${uid}`).emit('office:message:new', payload);
  }
}
