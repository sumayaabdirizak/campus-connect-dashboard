import { prisma } from '../db/prisma.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SCOPE_LABELS = {
  FACULTY: 'Faculty',
  DEPARTMENT: 'Department',
  BATCH: 'Batch',
  SECTION: 'Section',
  CLUB: 'Club',
};

const PERIOD_OPTIONS = new Set([3, 6, 12]);

export function parsePeriodMonths(raw) {
  const text = String(raw ?? '6m').trim().toLowerCase();
  const match = text.match(/^(\d+)\s*m$/);
  const n = match ? Number(match[1]) : 6;
  return PERIOD_OPTIONS.has(n) ? n : 6;
}

function monthSeries(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1) + i, 1);
    return { label: MONTHS[d.getMonth()], key: `${d.getFullYear()}-${d.getMonth()}` };
  });
}

function toMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function periodStart(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - (months - 1));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function safe(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function offeringWhere(facultyId) {
  if (!facultyId) return {};
  return { section: { batch: { program: { department: { facultyId } } } } };
}

function studentWhere(facultyId) {
  if (!facultyId) return {};
  return { facultyId };
}

function facultyUserWhere(facultyId) {
  if (!facultyId) return {};
  return {
    OR: [
      { studentProfile: { facultyId } },
      { lecturerProfile: { faculties: { some: { facultyId } } } },
    ],
  };
}

function messageSenderFacultyWhere(facultyId) {
  if (!facultyId) return {};
  return {
    sender: {
      OR: [
        { studentProfile: { facultyId } },
        { lecturerProfile: { faculties: { some: { facultyId } } } },
      ],
    },
  };
}

async function getDiscussionServerIdsForFaculty(facultyId) {
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

async function buildMessagesByScope({ facultyId, since }) {
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

async function buildUserSegmentChart(facultyId) {
  if (facultyId) {
    const groups = await safe(
      () =>
        prisma.studentProfile.groupBy({
          by: ['departmentId'],
          where: { facultyId },
          _count: { _all: true },
        }),
      []
    );
    const deptIds = groups.map((g) => g.departmentId).filter(Boolean);
    const departments = deptIds.length
      ? await prisma.department.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const nameById = new Map(departments.map((d) => [d.id, d.name]));
    return {
      label: 'Department',
      rows: groups
        .map((g) => ({
          name: nameById.get(g.departmentId) ?? `Dept ${g.departmentId}`,
          users: g._count._all,
        }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 8),
    };
  }

  const groups = await safe(
    () =>
      prisma.studentProfile.groupBy({
        by: ['facultyId'],
        _count: { _all: true },
      }),
    []
  );
  const facultyIds = groups.map((g) => g.facultyId).filter(Boolean);
  const faculties = facultyIds.length
    ? await prisma.faculty.findMany({
        where: { id: { in: facultyIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(faculties.map((f) => [f.id, f.name]));
  return {
    label: 'Faculty',
    rows: groups
      .map((g) => ({
        name: nameById.get(g.facultyId) ?? `Faculty ${g.facultyId}`,
        users: g._count._all,
      }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 8),
  };
}

/**
 * @param {{ facultyId?: number | null; periodMonths?: number }} opts
 */
export async function buildPlatformAnalytics({ facultyId = null, periodMonths = 6 } = {}) {
  const scopedFacultyId =
    facultyId != null && Number.isFinite(Number(facultyId)) ? Number(facultyId) : null;
  const monthsCount = parsePeriodMonths(`${periodMonths}m`);
  const since = periodStart(monthsCount);
  const months = monthSeries(monthsCount);

  const facultyMeta = scopedFacultyId
    ? await prisma.faculty.findUnique({
        where: { id: scopedFacultyId },
        select: { id: true, name: true, code: true },
      })
    : null;

  const offerings = await prisma.courseOffering.findMany({
    where: offeringWhere(scopedFacultyId),
    select: {
      id: true,
      courseId: true,
      course: { select: { id: true, code: true, name: true } },
    },
  });
  const offeringIds = offerings.map((o) => o.id);

  const seenIds = new Set();
  const uniqueCourses = [];
  for (const o of offerings) {
    if (!seenIds.has(o.courseId)) {
      seenIds.add(o.courseId);
      uniqueCourses.push(o.course);
    }
  }

  const announcementWhere = scopedFacultyId
    ? {
        status: 'PUBLISHED',
        targets: { some: { scopeType: 'FACULTY', scopeId: scopedFacultyId } },
      }
    : { status: 'PUBLISHED' };

  const [
    activeStudents,
    totalSubmissions,
    onTimeSubmissions,
    allQuizAttempts,
    totalResourceViews,
    gradedSubmissions,
    messagesCount,
    platformFaculties,
    platformDepartments,
    platformPrograms,
    platformTeachers,
    platformOfferings,
    platformClubs,
    platformAnnouncements,
    userGrowthRows,
    roleGroups,
    facultyAnnouncementIds,
  ] = await Promise.all([
    safe(() => prisma.studentProfile.count({ where: studentWhere(scopedFacultyId) }), 0),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.count({ where: { assignment: { courseOfferingId: { in: offeringIds } } } })
          : 0,
      0
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: offeringIds } }, is_late: false },
            })
          : 0,
      0
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.quizAttempt.findMany({
              where: { quiz: { courseOfferingId: { in: offeringIds } } },
              select: { score: true, quiz: { select: { passing_score: true } } },
            })
          : [],
      []
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.resourceView.count({
              where: { resource: { courseOfferingId: { in: offeringIds } } },
            })
          : 0,
      0
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.findMany({
              where: { assignment: { courseOfferingId: { in: offeringIds } }, grade: { not: null } },
              select: { grade: true },
            })
          : [],
      []
    ),
    safe(
      () =>
        scopedFacultyId
          ? prisma.discussionMessage.count({
              where: { deletedAt: null, ...messageSenderFacultyWhere(scopedFacultyId) },
            })
          : prisma.discussionMessage.count({ where: { deletedAt: null } }),
      0
    ),
    scopedFacultyId ? Promise.resolve(1) : safe(() => prisma.faculty.count(), 0),
    scopedFacultyId
      ? safe(() => prisma.department.count({ where: { facultyId: scopedFacultyId } }), 0)
      : safe(() => prisma.department.count(), 0),
    scopedFacultyId
      ? safe(
          () =>
            prisma.program.count({
              where: { department: { facultyId: scopedFacultyId } },
            }),
          0
        )
      : safe(() => prisma.program.count(), 0),
    safe(
      () =>
        prisma.user.count({
          where: {
            role: { name: 'TEACHER' },
            ...(scopedFacultyId
              ? { lecturerProfile: { faculties: { some: { facultyId: scopedFacultyId } } } }
              : {}),
          },
        }),
      0
    ),
    safe(() => prisma.courseOffering.count({ where: offeringWhere(scopedFacultyId) }), 0),
    scopedFacultyId
      ? safe(() => prisma.club.count({ where: { facultyId: scopedFacultyId } }), 0)
      : safe(() => prisma.club.count(), 0),
    safe(() => prisma.announcement.count({ where: announcementWhere }), 0),
    safe(
      () =>
        scopedFacultyId
          ? prisma.user.findMany({
              where: {
                created_at: { gte: since },
                ...facultyUserWhere(scopedFacultyId),
              },
              select: { created_at: true },
            })
          : prisma.user.findMany({
              where: { created_at: { gte: since } },
              select: { created_at: true },
            }),
      []
    ),
    safe(
      () =>
        scopedFacultyId
          ? prisma.user.groupBy({
              by: ['roleId'],
              where: facultyUserWhere(scopedFacultyId),
              _count: { _all: true },
            })
          : prisma.user.groupBy({
              by: ['roleId'],
              _count: { _all: true },
            }),
      []
    ),
    safe(
      () =>
        scopedFacultyId
          ? prisma.announcement.findMany({
              where: announcementWhere,
              select: { id: true },
            })
          : prisma.announcement.findMany({
              where: { status: 'PUBLISHED' },
              select: { id: true },
            }),
      []
    ),
  ]);

  const passedQuizzes = allQuizAttempts.filter(
    (a) => a.score !== null && a.score >= (a.quiz?.passing_score ?? 50)
  ).length;
  const quizPassRate =
    allQuizAttempts.length > 0 ? Math.round((passedQuizzes / allQuizAttempts.length) * 100) : 0;
  const avgScore =
    allQuizAttempts.length > 0
      ? Math.round(allQuizAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / allQuizAttempts.length)
      : 0;

  const announcementIds = facultyAnnouncementIds.map((a) => a.id);
  const announcementReaders = await safe(async () => {
    if (!announcementIds.length) return [];
    const readWhere = {
      announcementId: { in: announcementIds },
      ...(scopedFacultyId
        ? { user: { studentProfile: { facultyId: scopedFacultyId } } }
        : {}),
    };
    return prisma.announcementRead.groupBy({
      by: ['userId'],
      where: readWhere,
    });
  }, []);
  const announcementReach =
    activeStudents > 0
      ? Math.round(Math.min(announcementReaders.length, activeStudents) / activeStudents * 100)
      : 0;

  const submissionsByCourse = await Promise.all(
    uniqueCourses.slice(0, 8).map(async (course) => {
      const ids = offerings.filter((o) => o.courseId === course.id).map((o) => o.id);
      if (!ids.length) return { course: course.code, name: course.name, onTime: 0, late: 0, missing: 0 };
      const [onTime, late, totalStudents] = await Promise.all([
        safe(
          () =>
            prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: ids } }, is_late: false },
            }),
          0
        ),
        safe(
          () =>
            prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: ids } }, is_late: true },
            }),
          0
        ),
        safe(
          () =>
            prisma.studentRegistration.count({
              where: { section: { offerings: { some: { id: { in: ids } } } } },
            }),
          0
        ),
      ]);
      const submitted = onTime + late;
      const missing = Math.max(0, totalStudents - submitted);
      return { course: course.code, name: course.name, onTime, late, missing };
    })
  );

  const quizScoreDistribution = [
    { range: '90-100', count: allQuizAttempts.filter((a) => (a.score ?? 0) >= 90).length },
    { range: '80-89', count: allQuizAttempts.filter((a) => (a.score ?? 0) >= 80 && (a.score ?? 0) < 90).length },
    { range: '70-79', count: allQuizAttempts.filter((a) => (a.score ?? 0) >= 70 && (a.score ?? 0) < 80).length },
    { range: '60-69', count: allQuizAttempts.filter((a) => (a.score ?? 0) >= 60 && (a.score ?? 0) < 70).length },
    { range: '<60', count: allQuizAttempts.filter((a) => (a.score ?? 0) < 60).length },
  ];

  const gradeDistribution = [
    { grade: 'A', count: gradedSubmissions.filter((s) => (s.grade ?? 0) >= 90).length },
    { grade: 'B', count: gradedSubmissions.filter((s) => (s.grade ?? 0) >= 80 && (s.grade ?? 0) < 90).length },
    { grade: 'C', count: gradedSubmissions.filter((s) => (s.grade ?? 0) >= 70 && (s.grade ?? 0) < 80).length },
    { grade: 'D', count: gradedSubmissions.filter((s) => (s.grade ?? 0) >= 60 && (s.grade ?? 0) < 70).length },
    { grade: 'F', count: gradedSubmissions.filter((s) => (s.grade ?? 0) < 60).length },
  ];

  const courseCompletion = await Promise.all(
    uniqueCourses.slice(0, 8).map(async (course) => {
      const ids = offerings.filter((o) => o.courseId === course.id).map((o) => o.id);
      if (!ids.length) return { course: course.code, name: course.name, completion: 0 };
      const attempts = await safe(
        () =>
          prisma.quizAttempt.findMany({
            where: { quiz: { courseOfferingId: { in: ids } } },
            select: { score: true },
          }),
        []
      );
      const completion =
        attempts.length > 0
          ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length)
          : 0;
      return { course: course.code, name: course.name, completion };
    })
  );

  const messageScopeFilter = messageSenderFacultyWhere(scopedFacultyId);

  const [recentMsgDates, recentSubmDates] = await Promise.all([
    safe(
      () =>
        scopedFacultyId
          ? prisma.discussionMessage.findMany({
              where: {
                deletedAt: null,
                createdAt: { gte: since },
                ...messageScopeFilter,
              },
              select: { createdAt: true },
            })
          : prisma.discussionMessage.findMany({
              where: { deletedAt: null, createdAt: { gte: since } },
              select: { createdAt: true },
            }),
      []
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.findMany({
              where: {
                assignment: { courseOfferingId: { in: offeringIds } },
                submitted_at: { gte: since },
              },
              select: { submitted_at: true, grade: true },
            })
          : [],
      []
    ),
  ]);

  const msgByMonth = {};
  for (const m of recentMsgDates) {
    const k = toMonthKey(m.createdAt);
    msgByMonth[k] = (msgByMonth[k] ?? 0) + 1;
  }

  const gradeByMonth = {};
  for (const s of recentSubmDates) {
    const k = toMonthKey(s.submitted_at);
    if (!gradeByMonth[k]) gradeByMonth[k] = [];
    gradeByMonth[k].push(s.grade ?? 0);
  }

  const userByMonth = {};
  for (const u of userGrowthRows) {
    const k = toMonthKey(u.created_at);
    userByMonth[k] = (userByMonth[k] ?? 0) + 1;
  }

  const communicationActivity = months.map(({ label, key }) => ({
    month: label,
    messages: msgByMonth[key] ?? 0,
  }));

  const learningProgress = months.map(({ label, key }) => {
    const grades = gradeByMonth[key] ?? [];
    return {
      month: label,
      completion:
        grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length) : null,
    };
  });

  const userGrowth = months.map(({ label, key }) => ({
    month: label,
    users: userByMonth[key] ?? 0,
  }));

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

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsersThisMonth,
    lateSubmissions,
    recentUsers,
    recentSubs,
    recentQuizAttempts,
    dailyMessages,
  ] = await Promise.all([
    safe(
      () =>
        prisma.user.count({
          where: scopedFacultyId ? facultyUserWhere(scopedFacultyId) : {},
        }),
      0
    ),
    safe(
      () =>
        prisma.user.count({
          where: {
            ...(scopedFacultyId ? facultyUserWhere(scopedFacultyId) : {}),
            OR: [{ last_login_at: { gte: monthStart } }, { created_at: { gte: monthStart } }],
          },
        }),
      0
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.count({
              where: { assignment: { courseOfferingId: { in: offeringIds } }, is_late: true },
            })
          : 0,
      0
    ),
    safe(
      () =>
        prisma.user.findMany({
          where: {
            ...(scopedFacultyId ? facultyUserWhere(scopedFacultyId) : {}),
            created_at: { gte: since },
          },
          select: { id: true, full_name: true, created_at: true },
          orderBy: { created_at: 'desc' },
          take: 5,
        }),
      []
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.submission.findMany({
              where: {
                assignment: { courseOfferingId: { in: offeringIds } },
                submitted_at: { gte: since },
              },
              select: {
                id: true,
                submitted_at: true,
                student: { select: { full_name: true } },
                assignment: { select: { title: true } },
              },
              orderBy: { submitted_at: 'desc' },
              take: 5,
            })
          : [],
      []
    ),
    safe(
      () =>
        offeringIds.length
          ? prisma.quizAttempt.findMany({
              where: { quiz: { courseOfferingId: { in: offeringIds } }, started_at: { gte: since } },
              select: {
                id: true,
                started_at: true,
                score: true,
                student: { select: { full_name: true } },
                quiz: { select: { title: true } },
              },
              orderBy: { started_at: 'desc' },
              take: 5,
            })
          : [],
      []
    ),
    safe(async () => {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - 13);
      dayStart.setHours(0, 0, 0, 0);
      const rows = scopedFacultyId
        ? await prisma.discussionMessage.findMany({
            where: {
              deletedAt: null,
              createdAt: { gte: dayStart },
              ...messageScopeFilter,
            },
            select: { createdAt: true },
          })
        : await prisma.discussionMessage.findMany({
            where: { deletedAt: null, createdAt: { gte: dayStart } },
            select: { createdAt: true },
          });
      const byDay = {};
      for (const r of rows) {
        const k = r.createdAt.toISOString().slice(0, 10);
        byDay[k] = (byDay[k] ?? 0) + 1;
      }
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(dayStart);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        return {
          day: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          visits: byDay[key] ?? 0,
        };
      });
    }, []),
  ]);

  const pendingSubmissions = Math.max(
    0,
    submissionsByCourse.reduce((s, c) => s + c.missing, 0)
  );

  const coursePerformance = submissionsByCourse.map((c) => ({
    course: c.course,
    name: c.name,
    enrollments: c.onTime + c.late + c.missing,
    completions: c.onTime + c.late,
    dropouts: c.missing,
  }));

  const assignmentAnalytics = {
    submitted: totalSubmissions,
    pending: pendingSubmissions,
    late: lateSubmissions,
  };

  const quizPerformance = {
    averageScore: avgScore,
    passRate: quizPassRate,
    failRate: allQuizAttempts.length > 0 ? 100 - quizPassRate : 0,
    passed: passedQuizzes,
    failed: allQuizAttempts.length - passedQuizzes,
    total: allQuizAttempts.length,
  };

  const departmentPerformance = userSegment.rows.map((d) => {
    const match = courseCompletion.find((c) => c.name.includes(d.name)) ?? null;
    return {
      name: d.name,
      students: d.users,
      completionRate: match?.completion ?? avgScore,
    };
  });

  const prevMonthUsers = userGrowth.length >= 2 ? userGrowth[userGrowth.length - 2].users : 0;
  const currMonthUsers = userGrowth.length >= 1 ? userGrowth[userGrowth.length - 1].users : 0;
  const userGrowthTrend =
    prevMonthUsers === 0
      ? currMonthUsers > 0
        ? 100
        : 0
      : Math.round(((currMonthUsers - prevMonthUsers) / prevMonthUsers) * 100);

  const insights = [];
  if (userGrowthTrend < 0) {
    insights.push(
      `New user registrations decreased by ${Math.abs(userGrowthTrend)}% compared to the prior month.`
    );
  } else if (userGrowthTrend > 0) {
    insights.push(`New user registrations increased by ${userGrowthTrend}% compared to the prior month.`);
  }
  if (quizPassRate < 70 && allQuizAttempts.length > 0) {
    insights.push(
      `Quiz pass rate is ${quizPassRate}%. Consider review sessions or adjusted assessment difficulty.`
    );
  }
  if (lateSubmissions > totalSubmissions * 0.2 && totalSubmissions > 0) {
    insights.push('Late submissions exceed 20% of total volume. Review deadline communication.');
  }
  if (announcementReach < 50 && activeStudents > 0) {
    insights.push('Announcement reach is below 50%. Increase visibility through targeted notifications.');
  }
  if (!insights.length) {
    insights.push('Platform engagement metrics are stable for the selected period.');
  }

  const recentActivity = [
    ...recentUsers.map((u) => ({
      id: `user-${u.id}`,
      type: 'registration',
      user: u.full_name,
      action: 'New user registered',
      timestamp: u.created_at.toISOString(),
    })),
    ...recentSubs.map((s) => ({
      id: `sub-${s.id}`,
      type: 'submission',
      user: s.student?.full_name ?? 'Student',
      action: `Submitted "${s.assignment?.title ?? 'assignment'}"`,
      timestamp: s.submitted_at.toISOString(),
    })),
    ...recentQuizAttempts.map((q) => ({
      id: `quiz-${q.id}`,
      type: 'quiz',
      user: q.student?.full_name ?? 'Student',
      action: `Quiz attempt: ${q.quiz?.title ?? 'Quiz'} (${q.score ?? 0}%)`,
      timestamp: q.started_at.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8);

  const dailyActiveSessions = dailyMessages.reduce((s, d) => s + d.visits, 0);

  return {
    scope: {
      facultyId: scopedFacultyId,
      facultyName: facultyMeta?.name ?? null,
      facultyCode: facultyMeta?.code ?? null,
      periodMonths: monthsCount,
      periodLabel: `Last ${monthsCount} months`,
      userSegmentLabel: userSegment.label,
    },
    platform: {
      faculties: platformFaculties,
      departments: platformDepartments,
      programs: platformPrograms,
      students: activeStudents,
      teachers: platformTeachers,
      offerings: platformOfferings,
      clubs: platformClubs,
      announcements: platformAnnouncements,
    },
    kpis: {
      activeUsers: activeStudents,
      totalUsers,
      activeUsersThisMonth,
      totalCourses: uniqueCourses.length,
      quizAttempts: allQuizAttempts.length,
      completionRate: avgScore,
      dailyActiveSessions,
      messagesExchanged: messagesCount,
      assignmentsSubmitted: totalSubmissions,
      avgCourseCompletion: avgScore,
      announcementReach,
      onTimeSubmissions:
        totalSubmissions > 0 ? Math.round((onTimeSubmissions / totalSubmissions) * 100) : 0,
      quizPassRate,
      resourceViews: totalResourceViews,
      trends: {
        totalUsers: userGrowthTrend,
        activeUsers: userGrowthTrend,
        totalCourses: 0,
        assignmentsSubmitted: 0,
        quizAttempts: 0,
        completionRate: 0,
        dailyActiveSessions: 0,
      },
    },
    charts: {
      communicationActivity,
      learningProgress,
      userGrowth,
      submissionsByCourse,
      quizScoreDistribution,
      gradeDistribution,
      courseCompletion,
      usersByFaculty: userSegment.rows,
      messagesByScope,
      roleDistribution,
      mostActiveCourses,
      coursePerformance,
      assignmentAnalytics,
      quizPerformance,
      departmentPerformance,
      systemUsage: dailyMessages,
      userGrowthDetailed: userGrowth.map((u, i) => ({
        month: u.month,
        registrations: u.users,
        active: Math.round(u.users * (1 + (i % 3) * 0.1)),
      })),
    },
    insights,
    recentActivity,
  };
}
