import { prisma } from '../../../db/prisma.js';
import { HttpError } from '../../../utils/httpError.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { isOfficeInboxOversight } from '../../../../../shared/roles.js';
import { staffMembership, loadThreadScoped } from './helpers.js';

export async function getInbox(req, res) {
  const userId = Number(req.user.sub);
  const office = await prisma.supportOffice.findUnique({ where: { slug: req.params.slug } });
  if (!office) throw new HttpError(404, 'Office not found');
  const staff = await staffMembership(userId, office.id);
  if (!staff && !isOfficeInboxOversight(req.user?.role)) {
    throw new HttpError(403, 'You are not staff of this office');
  }
  const status = req.query.status ? String(req.query.status) : undefined;
  const mine = req.query.mine === 'true';
  const unassigned = req.query.unassigned === 'true';
  const { page, pageSize, skip } = parsePaginationQuery(req.query, {
    defaultPageSize: 50,
    maxPageSize: 200,
  });

  const where = {
    officeId: office.id,
    ...(status ? { status } : {}),
    ...(mine ? { assignedToId: userId } : {}),
    ...(unassigned ? { assignedToId: null, status: { not: 'RESOLVED' } } : {})
  };

  const [totalCount, threads] = await Promise.all([
    prisma.officeThread.count({ where }),
    prisma.officeThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        student: { select: { id: true, full_name: true, email: true } },
        assignedTo: { select: { id: true, full_name: true } },
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
      message: 'Inbox fetched',
      name: 'threads',
      items,
      page,
      pageSize,
      totalCount,
    })
  );
}

/** Agent: claim unassigned only. Manager: can take over any conversation. */
export async function claimThread(req, res) {
  const userId = Number(req.user.sub);
  const { thread, isStaff, isManager } = await loadThreadScoped(
    Number(req.params.id),
    userId,
    req.user?.role
  );
  if (!isStaff) throw new HttpError(403, 'Only office staff can claim conversations');

  if (thread.assignedToId && thread.assignedToId !== userId && !isManager) {
    throw new HttpError(403, 'Only a manager can take over an assigned conversation');
  }

  const updated = await prisma.officeThread.update({
    where: { id: thread.id },
    data: { assignedToId: userId },
    include: { assignedTo: { select: { id: true, full_name: true } } }
  });
  res.json(updated);
}

/** Manager only: assign conversation to any office staff member. */
export async function reassignThread(req, res) {
  const userId = Number(req.user.sub);
  const assigneeId = Number(req.body?.userId);
  if (!Number.isFinite(assigneeId)) throw new HttpError(400, 'userId is required');

  const { thread, isManager } = await loadThreadScoped(
    Number(req.params.id),
    userId,
    req.user?.role
  );
  if (!isManager) throw new HttpError(403, 'Only office managers can reassign conversations');

  const assignee = await staffMembership(assigneeId, thread.officeId);
  if (!assignee) throw new HttpError(400, 'Assignee must be staff of this office');

  const updated = await prisma.officeThread.update({
    where: { id: thread.id },
    data: { assignedToId: assigneeId },
    include: { assignedTo: { select: { id: true, full_name: true } } }
  });
  res.json(updated);
}

export async function updateStatus(req, res) {
  const userId = Number(req.user.sub);
  const status = String(req.body?.status ?? '');
  if (!['OPEN', 'AWAITING_STUDENT', 'RESOLVED'].includes(status)) {
    throw new HttpError(400, 'Invalid status');
  }
  const { thread, isStaff, isOfficeToOffice } = await loadThreadScoped(
    Number(req.params.id),
    userId,
    req.user?.role
  );
  if (!isStaff) throw new HttpError(403, 'Only office staff can change status');
  if (isOfficeToOffice) {
    throw new HttpError(400, 'Office-to-office chats do not use ticket status');
  }
  const updated = await prisma.officeThread.update({
    where: { id: thread.id },
    data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : null }
  });
  res.json(updated);
}
