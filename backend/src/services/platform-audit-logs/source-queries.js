import { prisma } from '../../db/prisma.js';
import { ACTOR_SELECT } from './constants.js';
import {
  mapAnnouncementRow,
  mapClubRow,
  mapDiscussionRow,
  mapSmsRow,
} from './row-mappers.js';

export async function countAnnouncementLogs(where) {
  return prisma.announcementAudit.count({ where });
}

export async function countDiscussionLogs(where) {
  return prisma.discussionAuditLog.count({ where });
}

export async function countClubLogs(where) {
  return prisma.clubModerationAudit.count({ where });
}

export async function countSmsLogs(where) {
  return prisma.smsAuditLog.count({ where });
}

export async function fetchAnnouncementLogs(where, { take, skip = 0 }) {
  const rows = await prisma.announcementAudit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: {
      actor: ACTOR_SELECT,
      announcement: { select: { id: true, title: true } },
    },
  });
  return rows.map(mapAnnouncementRow);
}

export async function fetchDiscussionLogs(where, { take, skip = 0 }) {
  const rows = await prisma.discussionAuditLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip,
    take,
    include: {
      actor: ACTOR_SELECT,
      server: { select: { id: true, name: true } },
      channel: { select: { id: true, name: true } },
    },
  });
  return rows.map(mapDiscussionRow);
}

export async function fetchClubLogs(where, { take, skip = 0 }) {
  const rows = await prisma.clubModerationAudit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: {
      actor: ACTOR_SELECT,
      club: { select: { id: true, name: true } },
    },
  });
  return rows.map(mapClubRow);
}

export async function fetchSmsLogs(where, { take, skip = 0 }) {
  const rows = await prisma.smsAuditLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    skip,
    take,
    include: {
      user: ACTOR_SELECT,
      announcement: { select: { id: true, title: true } },
    },
  });
  return rows.map(mapSmsRow);
}
