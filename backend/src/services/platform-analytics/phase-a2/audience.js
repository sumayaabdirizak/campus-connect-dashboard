import { prisma } from '../../../db/prisma.js';
import { buildMessagesByScope, buildUserSegmentChart } from '../analytics-helpers.js';

export async function buildAudienceCharts({ scopedFacultyId, since, roleGroups, submissionsByCourse }) {
  const userSegment = await buildUserSegmentChart(scopedFacultyId);

  const roleIds = roleGroups.map((g) => g.roleId);
  const roles = roleIds.length
    ? await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true, name: true } })
    : [];
  const roleNameById = new Map(roles.map((r) => [r.id, r.name]));
  const roleDistribution = roleGroups
    .map((g) => ({
      role: roleNameById.get(g.roleId) ?? 'Unknown',
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const messagesByScope = await buildMessagesByScope({
    facultyId: scopedFacultyId,
    since,
  });

  const mostActiveCourses = submissionsByCourse
    .map((c) => ({
      code: c.course,
      name: c.name,
      messages: c.onTime + c.late,
      posts: c.onTime + c.late,
    }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 6);

  return { userSegment, roleDistribution, messagesByScope, mostActiveCourses };
}
