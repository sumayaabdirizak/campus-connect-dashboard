import { prisma } from '../../../db/prisma.js';
import { SCOPE_LABELS } from './constants.js';
import { safe } from './safe.js';

export async function getDiscussionServerIdsForFaculty(facultyId) {
  const deptIds = (
    await prisma.department.findMany({ where: { facultyId }, select: { id: true } })
  ).map((d) => d.id);
  const programIds = deptIds.length
    ? (
        await prisma.program.findMany({
          where: { departmentId: { in: deptIds } },
          select: { id: true },
        })
      ).map((p) => p.id)
    : [];
  const batchIds = programIds.length
    ? (
        await prisma.batch.findMany({
          where: { programId: { in: programIds } },
          select: { id: true },
        })
      ).map((b) => b.id)
    : [];
  const sectionIds = batchIds.length
    ? (
        await prisma.batchSection.findMany({
          where: { batchId: { in: batchIds } },
          select: { id: true },
        })
      ).map((s) => s.id)
    : [];

  const or = [{ scopeType: 'FACULTY', scopeId: facultyId }];
  if (deptIds.length) or.push({ scopeType: 'DEPARTMENT', scopeId: { in: deptIds } });
  if (batchIds.length) or.push({ scopeType: 'BATCH', scopeId: { in: batchIds } });
  if (sectionIds.length) or.push({ scopeType: 'SECTION', scopeId: { in: sectionIds } });

  const groups = await prisma.discussionGroup.findMany({
    where: { OR: or },
    select: { id: true },
  });
  return groups.map((g) => g.id);
}

export async function buildMessagesByScope({ facultyId, since }) {
  return safe(async () => {
    const serverIds = facultyId ? await getDiscussionServerIdsForFaculty(facultyId) : null;
    const messageWhere = {
      deletedAt: null,
      channelId: { not: null },
      ...(since ? { createdAt: { gte: since } } : {}),
    };

    if (serverIds) {
      if (serverIds.length === 0) return [];
      const channels = await prisma.discussionChannel.findMany({
        where: { serverId: { in: serverIds } },
        select: { id: true, server: { select: { scopeType: true } } },
      });
      if (!channels.length) return [];
      const channelIds = channels.map((c) => c.id);
      const rows = await prisma.discussionMessage.groupBy({
        by: ['channelId'],
        where: { ...messageWhere, channelId: { in: channelIds } },
        _count: { _all: true },
      });
      const scopeByChannel = new Map(
        channels.map((c) => [c.id, c.server?.scopeType ?? 'SECTION'])
      );
      const totals = {};
      for (const row of rows) {
        const scope = scopeByChannel.get(row.channelId) ?? 'SECTION';
        totals[scope] = (totals[scope] ?? 0) + row._count._all;
      }
      return Object.entries(totals).map(([scope, messages]) => ({
        name: SCOPE_LABELS[scope] ?? scope,
        messages,
      }));
    }

    const rows = await prisma.discussionMessage.groupBy({
      by: ['channelId'],
      where: messageWhere,
      _count: { _all: true },
    });
    if (!rows.length) return [];
    const channelIds = rows.map((r) => r.channelId).filter(Boolean);
    const channels = await prisma.discussionChannel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, server: { select: { scopeType: true } } },
    });
    const scopeByChannel = new Map(
      channels.map((c) => [c.id, c.server?.scopeType ?? 'SECTION'])
    );
    const totals = {};
    for (const row of rows) {
      const scope = scopeByChannel.get(row.channelId) ?? 'SECTION';
      totals[scope] = (totals[scope] ?? 0) + row._count._all;
    }
    return Object.entries(totals).map(([scope, messages]) => ({
      name: SCOPE_LABELS[scope] ?? scope,
      messages,
    }));
  }, []);
}
