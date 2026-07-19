import { prisma } from '../../db/prisma.js';
import { startOfToday, startOfYesterday } from './date-helpers.js';

export async function getPlatformAuditStats() {
  const today = startOfToday();
  const yesterday = startOfYesterday();

  const [
    totalAnnouncement,
    totalDiscussion,
    totalClub,
    totalSms,
    todayAnnouncement,
    todayDiscussion,
    todayClub,
    todaySms,
    yesterdayAnnouncement,
    yesterdayDiscussion,
    yesterdayClub,
    yesterdaySms,
    failedSms,
    criticalDiscussion,
    criticalClub,
  ] = await Promise.all([
    prisma.announcementAudit.count(),
    prisma.discussionAuditLog.count(),
    prisma.clubModerationAudit.count(),
    prisma.smsAuditLog.count(),
    prisma.announcementAudit.count({ where: { createdAt: { gte: today } } }),
    prisma.discussionAuditLog.count({ where: { createdAt: { gte: today } } }),
    prisma.clubModerationAudit.count({ where: { createdAt: { gte: today } } }),
    prisma.smsAuditLog.count({ where: { sentAt: { gte: today } } }),
    prisma.announcementAudit.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.discussionAuditLog.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.clubModerationAudit.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.smsAuditLog.count({ where: { sentAt: { gte: yesterday, lt: today } } }),
    prisma.smsAuditLog.count({ where: { status: { in: ['FAILED', 'SKIPPED'] } } }),
    prisma.discussionAuditLog.count({
      where: { action: { in: ['CHANNEL_HARD_DELETE', 'MEMBER_KICK'] } },
    }),
    prisma.clubModerationAudit.count({
      where: { action: { in: ['REJECT', 'SUSPEND'] } },
    }),
  ]);

  const totalEvents = totalAnnouncement + totalDiscussion + totalClub + totalSms;
  const todayActivities = todayAnnouncement + todayDiscussion + todayClub + todaySms;
  const yesterdayActivities =
    yesterdayAnnouncement + yesterdayDiscussion + yesterdayClub + yesterdaySms;
  const failedActions = failedSms;
  const criticalEvents = criticalDiscussion + criticalClub + failedSms;

  const [annActors, discActors, clubActors, smsActors] = await Promise.all([
    prisma.announcementAudit.findMany({
      where: { createdAt: { gte: today }, actorId: { not: null } },
      distinct: ['actorId'],
      select: { actorId: true },
    }),
    prisma.discussionAuditLog.findMany({
      where: { createdAt: { gte: today } },
      distinct: ['actorUserId'],
      select: { actorUserId: true },
    }),
    prisma.clubModerationAudit.findMany({
      where: { createdAt: { gte: today }, actorUserId: { not: null } },
      distinct: ['actorUserId'],
      select: { actorUserId: true },
    }),
    prisma.smsAuditLog.findMany({
      where: { sentAt: { gte: today } },
      distinct: ['userId'],
      select: { userId: true },
    }),
  ]);

  const activeUserIds = new Set([
    ...annActors.map((r) => r.actorId),
    ...discActors.map((r) => r.actorUserId),
    ...clubActors.map((r) => r.actorUserId),
    ...smsActors.map((r) => r.userId),
  ]);

  const todayTrend =
    yesterdayActivities === 0
      ? todayActivities > 0
        ? 100
        : 0
      : Math.round(((todayActivities - yesterdayActivities) / yesterdayActivities) * 100);

  return {
    totalEvents,
    todayActivities,
    failedActions,
    criticalEvents,
    activeUsersToday: activeUserIds.size,
    trends: {
      todayActivities: todayTrend,
      totalEvents: 0,
      failedActions: 0,
      criticalEvents: 0,
      activeUsersToday: 0,
    },
  };
}
