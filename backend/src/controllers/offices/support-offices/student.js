import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { loadThreadScoped, nextReference, MESSAGE_SELECT } from './helpers.js';

export async function createThread(req, res) {
  const userId = Number(req.user.sub);
  const topic = String(req.body?.topic ?? '').trim();
  const message = String(req.body?.message ?? '').trim();
  if (!topic || topic.length > 120) throw new HttpError(400, 'Topic is required (max 120 chars)');
  if (!message || message.length > 5000) throw new HttpError(400, 'Message is required (max 5000 chars)');

  const office = await prisma.supportOffice.findUnique({ where: { slug: req.params.slug } });
  if (!office || !office.isActive) throw new HttpError(404, 'Office not found');

  const reference = await nextReference(office);
  const thread = await prisma.officeThread.create({
    data: {
      officeId: office.id,
      studentId: userId,
      topic,
      reference,
      messages: { create: { senderId: userId, content: message } }
    },
    include: { office: { select: { name: true, slug: true } } }
  });
  res.status(201).json(thread);
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
  const { thread, isStaff } = await loadThreadScoped(Number(req.params.id), userId);
  const messages = await prisma.discussionMessage.findMany({
    where: {
      officeThreadId: thread.id,
      ...(isStaff ? {} : { isInternalNote: false })
    },
    orderBy: { createdAt: 'asc' },
    select: MESSAGE_SELECT
  });
  res.json({ ...thread, isStaff, messages });
}

export async function createMessage(req, res) {
  const userId = Number(req.user.sub);
  const content = String(req.body?.content ?? '').trim();
  const internal = Boolean(req.body?.isInternalNote);
  if (!content || content.length > 5000) throw new HttpError(400, 'Message is required (max 5000 chars)');

  const { thread, isStaff } = await loadThreadScoped(Number(req.params.id), userId);
  if (internal && !isStaff) throw new HttpError(403, 'Only office staff can add internal notes');
  if (thread.status === 'RESOLVED' && !isStaff) {
    throw new HttpError(400, 'This conversation is resolved — start a new one if you need more help.');
  }

  const created = await prisma.discussionMessage.create({
    data: { officeThreadId: thread.id, senderId: userId, content, isInternalNote: internal },
    select: MESSAGE_SELECT
  });

  if (!internal) {
    await prisma.officeThread.update({
      where: { id: thread.id },
      data: { status: isStaff && thread.studentId !== userId ? 'AWAITING_STUDENT' : 'OPEN' }
    });
  }
  res.status(201).json(created);
}
