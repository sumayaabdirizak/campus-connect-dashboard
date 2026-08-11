import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { isOfficeInboxOversight } from '../../../../../shared/roles.js';
import { emitOfficeMessageNew } from '../../../services/offices/emitOfficeMessageNew.js';
import { markOfficeThreadRead } from '../../../services/offices/officeThreadRead.js';
import { nextReference, MESSAGE_SELECT } from './helpers.js';

const OFFICE_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  codePrefix: true,
  faculty: { select: { id: true, name: true, code: true } },
};

async function loadOversightDmPayload(slug, userId) {
  const office = await prisma.supportOffice.findFirst({
    where: { slug, isActive: true },
    select: OFFICE_SELECT,
  });
  if (!office) throw new HttpError(404, 'Office not found');

  const thread = await prisma.officeThread.findFirst({
    where: { officeId: office.id, studentId: userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      office: { select: { id: true, name: true, slug: true } },
      student: {
        select: {
          id: true,
          full_name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
      assignedTo: { select: { id: true, full_name: true } },
    },
  });

  if (!thread) return { office, thread: null, isOfficeToOffice: true };

  const messages = await prisma.discussionMessage.findMany({
    where: { officeThreadId: thread.id, isInternalNote: false },
    orderBy: { createdAt: 'asc' },
    select: MESSAGE_SELECT,
  });

  void markOfficeThreadRead(userId, thread.id);

  return {
    office,
    isOfficeToOffice: true,
    thread: {
      ...thread,
      isStaff: false,
      staffRole: null,
      isManager: false,
      isOfficeToOffice: true,
      messages,
    },
  };
}

/**
 * DM-style thread between oversight (ACADEMIC_OFFICE / SUPER_ADMIN) and one office.
 * One thread per (user, office).
 */
export async function getOversightOfficeDm(req, res) {
  if (!isOfficeInboxOversight(req.user?.role)) {
    throw new HttpError(403, 'Only academic leadership can use office DMs');
  }
  const payload = await loadOversightDmPayload(req.params.slug, Number(req.user.sub));
  res.json(payload);
}

/** First message opens the DM; later sends append to the same thread. */
export async function startOrContinueOversightOfficeDm(req, res) {
  if (!isOfficeInboxOversight(req.user?.role)) {
    throw new HttpError(403, 'Only academic leadership can use office DMs');
  }
  const userId = Number(req.user.sub);
  const content = String(req.body?.content ?? '').trim();
  if (!content || content.length > 5000) {
    throw new HttpError(400, 'Message is required (max 5000 chars)');
  }

  const office = await prisma.supportOffice.findFirst({
    where: { slug: req.params.slug, isActive: true },
  });
  if (!office) throw new HttpError(404, 'Office not found');

  let thread = await prisma.officeThread.findFirst({
    where: { officeId: office.id, studentId: userId },
    orderBy: { updatedAt: 'desc' },
  });

  const existed = Boolean(thread);
  let createdMessage;

  if (!thread) {
    const reference = await nextReference(office);
    const created = await prisma.officeThread.create({
      data: {
        officeId: office.id,
        studentId: userId,
        topic: `Chat with ${office.name}`,
        reference,
        messages: { create: { senderId: userId, content } },
      },
      include: {
        office: { select: { slug: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 1, select: MESSAGE_SELECT },
      },
    });
    thread = created;
    createdMessage = created.messages?.[0] ?? null;
  } else {
    createdMessage = await prisma.discussionMessage.create({
      data: {
        officeThreadId: thread.id,
        senderId: userId,
        content,
        isInternalNote: false,
      },
      select: MESSAGE_SELECT,
    });
    await prisma.officeThread.update({
      where: { id: thread.id },
      data: { status: 'OPEN', resolvedAt: null },
    });
  }

  if (createdMessage) {
    void emitOfficeMessageNew({
      thread: {
        id: thread.id,
        officeId: office.id,
        studentId: userId,
        office: { slug: office.slug },
      },
      message: createdMessage,
    });
  }

  void markOfficeThreadRead(userId, thread.id);

  const payload = await loadOversightDmPayload(office.slug, userId);
  res.status(existed ? 200 : 201).json(payload);
}
