import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { emitOfficeMessageNew } from '../../../services/offices/emitOfficeMessageNew.js';
import { markOfficeThreadRead } from '../../../services/offices/officeThreadRead.js';
import {
  loadThreadScoped,
  nextReference,
  MESSAGE_SELECT,
  staffMembership,
} from './helpers.js';
import { assertStudentMayContactOffice } from './studentOfficeContactScope.js';

export async function createThread(req, res) {
  const userId = Number(req.user.sub);
  const topic = String(req.body?.topic ?? '').trim();
  const message = String(req.body?.message ?? '').trim();
  if (!topic || topic.length > 120) throw new HttpError(400, 'Topic is required (max 120 chars)');
  if (!message || message.length > 5000) throw new HttpError(400, 'Message is required (max 5000 chars)');

  const office = await prisma.supportOffice.findUnique({ where: { slug: req.params.slug } });
  if (!office || !office.isActive) throw new HttpError(404, 'Office not found');

  const membership = await staffMembership(userId, office.id);
  if (membership) {
    throw new HttpError(403, 'You are staff of this office — open the office inbox instead');
  }

  const contactGate = await assertStudentMayContactOffice(req, office);
  if (!contactGate.ok) {
    throw new HttpError(contactGate.status, contactGate.message);
  }

  const reference = await nextReference(office);
  const thread = await prisma.officeThread.create({
    data: {
      officeId: office.id,
      studentId: userId,
      topic,
      reference,
      messages: { create: { senderId: userId, content: message } }
    },
    include: {
      office: { select: { name: true, slug: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: MESSAGE_SELECT,
      },
    }
  });
  const first = thread.messages?.[0] ?? null;
  if (first) {
    void emitOfficeMessageNew({
      thread: {
        id: thread.id,
        officeId: thread.officeId,
        studentId: thread.studentId,
        office: thread.office,
      },
      message: first,
    });
  }
  const { messages: _m, ...rest } = thread;
  res.status(201).json(rest);
}

export async function listMyThreads(req, res) {
  const userId = Number(req.user.sub);
  const { page, pageSize, skip } = parsePaginationQuery(req.query, {
    defaultPageSize: 50,
    maxPageSize: 200,
  });
  const where = { studentId: userId };
  const [totalCount, threads] = await Promise.all([
    prisma.officeThread.count({ where }),
    prisma.officeThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        office: { select: { name: true, slug: true } },
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderId: true }
        }
      }
    }),
  ]);
  const items = threads.map((t) => ({ ...t, lastMessage: t.messages[0] ?? null, messages: undefined }));
  res.json(
    namedListSuccess({
      message: 'Threads fetched',
      name: 'threads',
      items,
      page,
      pageSize,
      totalCount,
    })
  );
}

export async function getThread(req, res) {
  const userId = Number(req.user.sub);
  const { thread, isStaff, staffRole, isManager, isOfficeToOffice } = await loadThreadScoped(
    Number(req.params.id),
    userId,
    req.user?.role
  );
  const messages = await prisma.discussionMessage.findMany({
    where: {
      officeThreadId: thread.id,
      ...(isStaff && !isOfficeToOffice ? {} : { isInternalNote: false })
    },
    orderBy: { createdAt: 'asc' },
    select: MESSAGE_SELECT
  });
  void markOfficeThreadRead(userId, thread.id);
  res.json({ ...thread, isStaff, staffRole, isManager, isOfficeToOffice, messages });
}

export async function createMessage(req, res) {
  const userId = Number(req.user.sub);
  const content = String(req.body?.content ?? '').trim();
  const internal = Boolean(req.body?.isInternalNote);
  if (!content || content.length > 5000) throw new HttpError(400, 'Message is required (max 5000 chars)');

  const { thread, isStaff, isOfficeToOffice } = await loadThreadScoped(
    Number(req.params.id),
    userId,
    req.user?.role
  );
  if (internal && (!isStaff || isOfficeToOffice)) {
    throw new HttpError(403, 'Only office staff can add internal notes');
  }
  if (thread.status === 'RESOLVED' && !isStaff && !isOfficeToOffice) {
    throw new HttpError(400, 'This conversation is resolved — start a new one if you need more help.');
  }

  const created = await prisma.discussionMessage.create({
    data: {
      officeThreadId: thread.id,
      senderId: userId,
      content,
      isInternalNote: isOfficeToOffice ? false : internal,
    },
    select: MESSAGE_SELECT
  });

  if (!internal || isOfficeToOffice) {
    await prisma.officeThread.update({
      where: { id: thread.id },
      data: isOfficeToOffice
        ? { status: 'OPEN', resolvedAt: null }
        : {
            status:
              isStaff && thread.studentId !== userId ? 'AWAITING_STUDENT' : 'OPEN',
          },
    });
  }

  if (!created.isInternalNote) {
    void emitOfficeMessageNew({ thread, message: created });
  }
  void markOfficeThreadRead(userId, thread.id);
  res.status(201).json(created);
}
