import { prisma } from '../db/prisma.js';

/**
 * Institutional oversight reports for deans (faculty-scoped) and admins
 * (platform-wide, `facultyId: null`): login history and per-teacher activity.
 */

/**
 * @param {{ facultyId: number | null; page?: number; pageSize?: number; search?: string; from?: Date | null; to?: Date | null }} opts
 */
export async function listUserLoginLogs({
  facultyId,
  page = 1,
  pageSize = 20,
  search = '',
  from = null,
  to = null,
} = {}) {
  const skip = (page - 1) * pageSize;

  const userWhere = {
    ...(facultyId
      ? {
          OR: [
            { studentProfile: { facultyId } },
            { lecturerProfile: { faculties: { some: { facultyId } } } },
            { deanProfile: { facultyId } },
          ],
        }
      : {}),
    ...(search
      ? {
          OR: [
            { full_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { number: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const where = {
    user: userWhere,
    ...((from || to)
      ? { loginAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const [totalCount, rows] = await Promise.all([
    prisma.userLoginLog.count({ where }),
    prisma.userLoginLog.findMany({
      where,
      orderBy: { loginAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        loginAt: true,
        ipAddress: true,
        userAgent: true,
        user: {
          select: { id: true, full_name: true, email: true, role: { select: { name: true } } },
        },
      },
    }),
  ]);

  return {
    totalCount,
    page,
    pageSize,
    results: rows.map((r) => ({
      id: r.id,
      loginAt: r.loginAt.toISOString(),
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      userId: r.user.id,
      fullName: r.user.full_name,
      email: r.user.email,
      role: r.user.role?.name ?? null,
    })),
  };
}

/**
 * @param {{ facultyId: number | null; departmentId?: number | null; search?: string }} opts
 */
export async function listTeacherActivity({ facultyId, departmentId = null, search = '' } = {}) {
  const teacherWhere = {
    lecturerProfile: {
      ...(facultyId ? { faculties: { some: { facultyId } } } : {}),
      ...(departmentId ? { departmentId } : {}),
    },
    ...(search
      ? {
          OR: [
            { full_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const teachers = await prisma.user.findMany({
    where: teacherWhere,
    select: {
      id: true,
      full_name: true,
      email: true,
      last_login_at: true,
      lecturerProfile: {
        select: { department: { select: { id: true, name: true, code: true } } },
      },
      teacherAssignings: { select: { courseId: true } },
    },
    orderBy: { full_name: 'asc' },
  });

  if (teachers.length === 0) return [];

  const teacherIds = teachers.map((t) => t.id);
  const courseIdsByTeacher = new Map(
    teachers.map((t) => [t.id, t.teacherAssignings.map((a) => a.courseId)]),
  );
  const allCourseIds = [...new Set(teachers.flatMap((t) => courseIdsByTeacher.get(t.id)))];
  const offeringsForCourses = allCourseIds.length
    ? await prisma.courseOffering.findMany({
        where: { courseId: { in: allCourseIds } },
        select: { id: true, courseId: true },
      })
    : [];
  const offeringIdsByCourse = new Map();
  for (const o of offeringsForCourses) {
    const list = offeringIdsByCourse.get(o.courseId) ?? [];
    list.push(o.id);
    offeringIdsByCourse.set(o.courseId, list);
  }
  const offeringIdsByTeacher = new Map(
    teachers.map((t) => [
      t.id,
      (courseIdsByTeacher.get(t.id) ?? []).flatMap((cid) => offeringIdsByCourse.get(cid) ?? []),
    ]),
  );
  const allOfferingIds = [...new Set(teachers.flatMap((t) => offeringIdsByTeacher.get(t.id)))];

  const [assignments, quizzes, gradedRows, resources, feedPosts, chatMessages, latestLogins] =
    await Promise.all([
      allOfferingIds.length
        ? prisma.assignment.groupBy({
            by: ['courseOfferingId'],
            where: { courseOfferingId: { in: allOfferingIds } },
            _count: { _all: true },
          })
        : [],
      allOfferingIds.length
        ? prisma.quiz.groupBy({
            by: ['courseOfferingId'],
            where: { courseOfferingId: { in: allOfferingIds } },
            _count: { _all: true },
          })
        : [],
      prisma.submissionGrade.groupBy({
        by: ['gradedById'],
        where: { gradedById: { in: teacherIds } },
        _count: { _all: true },
      }),
      prisma.resource.groupBy({
        by: ['teacherId'],
        where: { teacherId: { in: teacherIds } },
        _count: { _all: true },
      }),
      prisma.coursePost.groupBy({
        by: ['authorId'],
        where: { authorId: { in: teacherIds } },
        _count: { _all: true },
      }),
      prisma.chatMessage.groupBy({
        by: ['senderId'],
        where: { senderId: { in: teacherIds }, room: { courseOfferingId: { not: null } } },
        _count: { _all: true },
      }),
      prisma.userLoginLog.groupBy({
        by: ['userId'],
        where: { userId: { in: teacherIds } },
        _max: { loginAt: true },
      }),
    ]);

  const assignmentsByOffering = new Map(assignments.map((a) => [a.courseOfferingId, a._count._all]));
  const quizzesByOffering = new Map(quizzes.map((q) => [q.courseOfferingId, q._count._all]));
  const gradedByTeacher = new Map(gradedRows.map((g) => [g.gradedById, g._count._all]));
  const resourcesByTeacher = new Map(resources.map((r) => [r.teacherId, r._count._all]));
  const feedByTeacher = new Map(feedPosts.map((f) => [f.authorId, f._count._all]));
  const chatByTeacher = new Map(chatMessages.map((c) => [c.senderId, c._count._all]));
  const lastLoginByTeacher = new Map(latestLogins.map((l) => [l.userId, l._max.loginAt]));

  return teachers.map((t) => {
    const offeringIds = offeringIdsByTeacher.get(t.id) ?? [];
    const assignmentsCount = offeringIds.reduce(
      (sum, id) => sum + (assignmentsByOffering.get(id) ?? 0),
      0,
    );
    const quizzesCount = offeringIds.reduce((sum, id) => sum + (quizzesByOffering.get(id) ?? 0), 0);
    return {
      userId: t.id,
      fullName: t.full_name,
      email: t.email,
      department: t.lecturerProfile?.department
        ? { id: t.lecturerProfile.department.id, name: t.lecturerProfile.department.name }
        : null,
      courseCount: offeringIds.length,
      assignmentsCount,
      quizzesCount,
      gradedCount: gradedByTeacher.get(t.id) ?? 0,
      resourcesCount: resourcesByTeacher.get(t.id) ?? 0,
      feedPostsCount: feedByTeacher.get(t.id) ?? 0,
      chatMessagesCount: chatByTeacher.get(t.id) ?? 0,
      lastLoginAt: (lastLoginByTeacher.get(t.id) ?? t.last_login_at)?.toISOString?.() ?? null,
    };
  });
}

/**
 * Upcoming assignment/quiz deadlines — course-level only, never a specific
 * student's submission or grade. Faculty-scoped for deans, platform-wide
 * (facultyId: null) for admins. Mirrors the calendar's Dean scoping in
 * `calendarDeadlines.service.js` (`buildVisibleOfferingWhere`).
 *
 * @param {{ facultyId: number | null; days?: number; limit?: number }} opts
 */
export async function listUpcomingDeadlines({ facultyId, days = 14, limit = 20 } = {}) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const courseOffering = facultyId
    ? {
        section: {
          batch: { program: { department: { facultyId } } },
        },
      }
    : {};

  const [assignments, quizzes] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        lifecycle: { publishStatus: 'PUBLISHED' },
        due_date: { gte: now, lte: until },
        courseOffering,
      },
      select: {
        id: true,
        title: true,
        due_date: true,
        courseOffering: { select: { course: { select: { code: true, name: true } } } },
      },
      orderBy: { due_date: 'asc' },
      take: limit,
    }),
    prisma.quiz.findMany({
      where: {
        is_draft: false,
        close_at: { not: null, gte: now, lte: until },
        courseOffering,
      },
      select: {
        id: true,
        title: true,
        close_at: true,
        courseOffering: { select: { course: { select: { code: true, name: true } } } },
      },
      orderBy: { close_at: 'asc' },
      take: limit,
    }),
  ]);

  const rows = [
    ...assignments.map((a) => ({
      kind: 'ASSIGNMENT',
      id: a.id,
      title: a.title,
      dueAt: a.due_date.toISOString(),
      courseCode: a.courseOffering?.course?.code ?? null,
      courseName: a.courseOffering?.course?.name ?? null,
    })),
    ...quizzes.map((q) => ({
      kind: 'QUIZ',
      id: q.id,
      title: q.title,
      dueAt: q.close_at.toISOString(),
      courseCode: q.courseOffering?.course?.code ?? null,
      courseName: q.courseOffering?.course?.name ?? null,
    })),
  ];

  rows.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  return rows.slice(0, limit);
}
