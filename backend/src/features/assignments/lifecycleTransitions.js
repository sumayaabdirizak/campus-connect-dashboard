import { prisma } from '../../db/prisma.js';
import { publishStatusFromDraft, resolveScheduleStatus } from './lifecycleCore.js';

/**
 * Upsert lifecycle + append event.
 * @param {import('@prisma/client').Prisma.TransactionClient | typeof prisma} [db]
 */
export async function ensureLifecycle(
  assignmentId,
  { isDraft, openAt, dueDate, lateWindowMinutes, actorUserId, eventType },
  db = prisma,
) {
  const publishStatus = publishStatusFromDraft(Boolean(isDraft));
  const scheduleStatus = resolveScheduleStatus(openAt, dueDate, lateWindowMinutes ?? 0);
  const existing = await db.assignmentLifecycle.findUnique({
    where: { assignmentId },
    select: { publishStatus: true },
  });
  await db.assignmentLifecycle.upsert({
    where: { assignmentId },
    create: {
      assignmentId,
      publishStatus,
      scheduleStatus,
      computedAt: new Date(),
    },
    update: {
      publishStatus,
      scheduleStatus,
      computedAt: new Date(),
    },
  });
  await db.assignmentLifecycleEvent.create({
    data: {
      assignmentId,
      eventType: eventType ?? (existing ? 'SCHEDULE_CHANGED' : 'CREATED'),
      fromStatus: existing?.publishStatus ?? null,
      toStatus: publishStatus,
      actorUserId: actorUserId ?? null,
    },
  });
  return { publishStatus, scheduleStatus };
}

export async function transitionPublish(assignmentId, toStatus, actorUserId, db = prisma) {
  const existing = await db.assignmentLifecycle.findUnique({
    where: { assignmentId },
  });
  const from = existing?.publishStatus ?? null;
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: { open_at: true, due_date: true, lateWindowMinutes: true },
  });
  const scheduleStatus = assignment
    ? resolveScheduleStatus(assignment.open_at, assignment.due_date, assignment.lateWindowMinutes)
    : 'OPEN';

  await db.assignmentLifecycle.upsert({
    where: { assignmentId },
    create: {
      assignmentId,
      publishStatus: toStatus,
      scheduleStatus,
      computedAt: new Date(),
    },
    update: {
      publishStatus: toStatus,
      scheduleStatus,
      computedAt: new Date(),
    },
  });

  let eventType = 'SCHEDULE_CHANGED';
  if (toStatus === 'PUBLISHED') eventType = 'PUBLISHED';
  else if (toStatus === 'DRAFT') eventType = 'UNPUBLISHED';
  else if (toStatus === 'ARCHIVED') eventType = 'ARCHIVED';

  await db.assignmentLifecycleEvent.create({
    data: {
      assignmentId,
      eventType,
      fromStatus: from,
      toStatus,
      actorUserId: actorUserId ?? null,
    },
  });

  return { publishStatus: toStatus, scheduleStatus };
}
