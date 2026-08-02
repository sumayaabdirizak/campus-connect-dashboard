import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { isOfficeInboxOversight } from '../../../../../shared/roles.js';

export const MESSAGE_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  isInternalNote: true,
  sender: { select: { id: true, full_name: true } },
  attachments: { select: { id: true, url: true, mimeType: true } }
};

const STUDENT_SELECT = {
  id: true,
  full_name: true,
  email: true,
  role: { select: { name: true } },
};

/** Office-staff row for the caller, or null. */
export async function staffMembership(userId, officeId) {
  return prisma.supportOfficeStaff.findUnique({
    where: { officeId_userId: { officeId, userId } }
  });
}

/**
 * Load a thread and assert the caller may see it.
 * @param {number} threadId
 * @param {number} userId
 * @param {string} [platformRole]
 */
export async function loadThreadScoped(threadId, userId, platformRole) {
  const thread = await prisma.officeThread.findUnique({
    where: { id: threadId },
    include: {
      office: { select: { id: true, name: true, slug: true } },
      student: { select: STUDENT_SELECT },
      assignedTo: { select: { id: true, full_name: true } }
    }
  });
  if (!thread) throw new HttpError(404, 'Conversation not found');

  const oversight = isOfficeInboxOversight(platformRole);
  const staff = oversight ? null : await staffMembership(userId, thread.officeId);
  if (thread.studentId !== userId && !staff && !oversight) {
    // 404 (not 403) so outsiders can't probe which thread ids exist.
    throw new HttpError(404, 'Conversation not found');
  }
  // Initiator of the thread is always the "student" side (DM-like for Academic Office).
  const isInitiator = thread.studentId === userId;
  const isStaff = isInitiator ? false : Boolean(staff) || oversight;
  const initiatorRole = thread.student?.role?.name;
  const isOfficeToOffice = isOfficeInboxOversight(initiatorRole);
  return {
    thread,
    isStaff,
    staff,
    staffRole: isInitiator ? null : staff?.role ?? (oversight ? 'MANAGER' : null),
    isManager: isInitiator ? false : staff?.role === 'MANAGER' || oversight,
    isOfficeToOffice,
  };
}

/** EXM-2026-0142 style reference; retries once on a collision. */
export async function nextReference(office) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 2; attempt++) {
    const count = await prisma.officeThread.count({ where: { officeId: office.id } });
    const seq = String(count + 1 + attempt).padStart(4, '0');
    const reference = `${office.codePrefix}-${year}-${seq}`;
    const exists = await prisma.officeThread.findUnique({ where: { reference } });
    if (!exists) return reference;
  }
  // Fall back to something guaranteed unique but still readable.
  return `${office.codePrefix}-${year}-${Date.now().toString(36).toUpperCase()}`;
}
