import { buildDateWhere } from './date-helpers.js';

export function buildAnnouncementWhere({ dateFrom, dateTo, actorId, search }) {
  const where = { ...buildDateWhere(dateFrom, dateTo) };
  if (actorId != null) where.actorId = actorId;
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { announcement: { title: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

export function buildDiscussionWhere({ dateFrom, dateTo, actorId, search }) {
  const where = { ...buildDateWhere(dateFrom, dateTo) };
  if (actorId != null) where.actorUserId = actorId;
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { targetType: { contains: search, mode: 'insensitive' } },
      { server: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

export function buildClubWhere({ dateFrom, dateTo, actorId, search }) {
  const where = { ...buildDateWhere(dateFrom, dateTo) };
  if (actorId != null) where.actorUserId = actorId;
  if (search) {
    where.OR = [
      { reason: { contains: search, mode: 'insensitive' } },
      { club: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

export function buildSmsWhere({ dateFrom, dateTo, actorId, search, status }) {
  const where = { ...buildDateWhere(dateFrom, dateTo, 'sentAt') };
  if (actorId != null) where.userId = actorId;
  if (status === 'failed') where.status = { in: ['FAILED', 'SKIPPED'] };
  if (status === 'success') where.status = 'SENT';
  if (search) {
    where.OR = [
      { reason: { contains: search, mode: 'insensitive' } },
      { announcement: { title: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}
