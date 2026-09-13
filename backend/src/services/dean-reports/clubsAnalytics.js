import { prisma } from '../../db/prisma.js';

/**
 * Clubs oversight report for a Dean (their own faculty) or a Super Admin
 * (pass facultyId=null for an all-faculties rollup).
 *
 * @param {{ facultyId?: number | null }} opts
 */
export async function buildClubsReport({ facultyId = null } = {}) {
  const clubWhere = facultyId != null ? { facultyId } : {};

  const clubs = await prisma.club.findMany({
    where: clubWhere,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      scopeKind: true,
      isOfficial: true,
      memberCountCache: true,
      lastActivityAt: true,
      createdAt: true,
      facultyId: true,
      faculty: { select: { name: true, code: true } },
    },
  });

  const clubIds = clubs.map((c) => c.id);

  const joinRequestCounts = clubIds.length
    ? await prisma.clubJoinRequest.groupBy({
        by: ['clubId', 'status'],
        where: { clubId: { in: clubIds } },
        _count: { _all: true },
      })
    : [];

  const requestStatsByClub = new Map();
  for (const row of joinRequestCounts) {
    const stats = requestStatsByClub.get(row.clubId) ?? {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };
    const key = String(row.status).toLowerCase();
    if (key in stats) stats[key] = row._count._all;
    requestStatsByClub.set(row.clubId, stats);
  }

  const clubRows = clubs.map((c) => {
    const requestStats = requestStatsByClub.get(c.id) ?? {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      scopeKind: c.scopeKind,
      isOfficial: c.isOfficial,
      memberCount: c.memberCountCache,
      lastActivityAt: c.lastActivityAt,
      createdAt: c.createdAt,
      facultyId: c.facultyId,
      facultyName: c.faculty?.name ?? null,
      joinRequests: requestStats,
    };
  });

  const totalClubs = clubRows.length;
  const activeClubs = clubRows.filter((c) => c.status === 'APPROVED').length;
  const pendingApprovalClubs = clubRows.filter((c) => c.status === 'PENDING').length;
  const totalMembers = clubRows.reduce((sum, c) => sum + (c.memberCount ?? 0), 0);
  const totalJoinRequests = clubRows.reduce(
    (sum, c) =>
      sum +
      c.joinRequests.pending +
      c.joinRequests.approved +
      c.joinRequests.rejected +
      c.joinRequests.cancelled,
    0
  );

  const topClubsByMembers = [...clubRows]
    .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))
    .slice(0, 10)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const mostActiveClubs = [...clubRows]
    .filter((c) => c.lastActivityAt)
    .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))
    .slice(0, 10)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const byFacultyMap = new Map();
  for (const c of clubRows) {
    const key = c.facultyId ?? 'unscoped';
    const bucket = byFacultyMap.get(key) ?? {
      facultyId: c.facultyId,
      facultyName: c.facultyName ?? 'Unscoped',
      clubCount: 0,
      memberCount: 0,
    };
    bucket.clubCount += 1;
    bucket.memberCount += c.memberCount ?? 0;
    byFacultyMap.set(key, bucket);
  }
  const byFaculty = [...byFacultyMap.values()].sort((a, b) => b.memberCount - a.memberCount);

  return {
    scope: { facultyId: facultyId ?? null, generatedAt: new Date().toISOString() },
    summary: {
      totalClubs,
      activeClubs,
      pendingApprovalClubs,
      totalMembers,
      totalJoinRequests,
    },
    topClubsByMembers,
    mostActiveClubs,
    byFaculty: facultyId == null ? byFaculty : undefined,
    clubs: clubRows,
  };
}
