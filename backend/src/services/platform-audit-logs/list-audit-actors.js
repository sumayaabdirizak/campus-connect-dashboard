import { prisma } from '../../db/prisma.js';

export async function listAuditActors() {
  const [ann, disc, club, sms] = await Promise.all([
    prisma.announcementAudit.findMany({
      where: { actorId: { not: null } },
      distinct: ['actorId'],
      select: { actorId: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    prisma.discussionAuditLog.findMany({
      distinct: ['actorUserId'],
      select: { actorUserId: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    prisma.clubModerationAudit.findMany({
      where: { actorUserId: { not: null } },
      distinct: ['actorUserId'],
      select: { actorUserId: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    prisma.smsAuditLog.findMany({
      distinct: ['userId'],
      select: { userId: true },
      orderBy: { sentAt: 'desc' },
      take: 80,
    }),
  ]);

  const ids = [
    ...new Set([
      ...ann.map((r) => r.actorId),
      ...disc.map((r) => r.actorUserId),
      ...club.map((r) => r.actorUserId),
      ...sms.map((r) => r.userId),
    ]),
  ].filter(Boolean);

  if (!ids.length) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids.slice(0, 100) } },
    select: { id: true, full_name: true, email: true, role: { select: { name: true } } },
    orderBy: { full_name: 'asc' },
  });

  return users.map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role?.name ?? null,
  }));
}
