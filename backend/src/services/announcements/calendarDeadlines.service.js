import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  isPrismaAnnouncementSchemaDriftError,
} from './announcementVisibility.service.js';
import { NOTIF_KIND } from '../../../../shared/notifications.js';

/**
 * **All-day rule (API + iCal):** `deadlineAt` stored in UTC. If the instant is exactly
 * `00:00:00.000Z`, clients and ICS treat it as an **all-day** calendar date (no time-of-day).
 * Any other UTC time is a **timed** deadline (floating UTC in ICS via `Z` suffix).
 *
 * @param {Date | string | null | undefined} deadlineAt
 */
export function isAnnouncementDeadlineAllDayUtc(deadlineAt) {
  if (!deadlineAt) return false;
  const d = deadlineAt instanceof Date ? deadlineAt : new Date(deadlineAt);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {unknown} visibilityUser
 * @param {Date} fromRaw
 * @param {Date} toRaw
 */
export async function loadVisibleCalendarDeadlineRows(prisma, visibilityUser, fromRaw, toRaw) {
  const baseWhere = buildVisibleAnnouncementsWhere(visibilityUser);
  const rangeWhere = {
    deadlineAt: { not: null, gte: fromRaw, lte: toRaw },
  };

  let rows;
  try {
    rows = await prisma.announcement.findMany({
      where: { AND: [baseWhere, rangeWhere] },
      select: {
        id: true,
        title: true,
        content: true,
        deadlineAt: true,
        targetType: true,
        facultyId: true,
        departmentId: true,
        batchId: true,
        sectionId: true,
      },
      orderBy: { deadlineAt: 'asc' },
      take: 500,
    });
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    rows = await prisma.announcement.findMany({
      where: { AND: [buildVisibleAnnouncementsWhereLegacy(visibilityUser), rangeWhere] },
      select: {
        id: true,
        title: true,
        content: true,
        deadlineAt: true,
        targetType: true,
        facultyId: true,
        departmentId: true,
        batchId: true,
        sectionId: true,
      },
      orderBy: { deadlineAt: 'asc' },
      take: 500,
    });
  }
  return rows;
}

/**
 * Prisma `where` on CourseOffering restricting to the offerings a user may see,
 * by role. Mirrors the app's RBAC scoping.
 *
 * @param {{ userId: number, role: string, facultyIds?: number[], sectionIds?: number[] }} loaded
 */
export function buildVisibleOfferingWhere(loaded) {
  const role = loaded?.role;
  if (role === 'SUPER_ADMIN' || role === 'ACADEMIC_OFFICE') return {};
  if (role === 'TEACHER') return { teacherId: Number(loaded.userId) };
  if (role === 'STUDENT') {
    return { sectionId: { in: (loaded.sectionIds ?? []).map(Number) } };
  }
  if (role === 'DEAN') {
    return {
      section: {
        batch: { program: { department: { facultyId: { in: (loaded.facultyIds ?? []).map(Number) } } } },
      },
    };
  }
  return { id: -1 }; // unknown role → match nothing
}

/**
 * Academic deadlines (published assignment due-dates + quiz close-times) visible
 * to the caller within [from, to].
 *
 * Teachers author these items — they do not receive quiz/assignment deadlines on
 * their personal calendar (students and other scoped roles still do).
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ userId: number, role: string, facultyIds?: number[], sectionIds?: number[] }} loaded
 * @param {Date} fromRaw
 * @param {Date} toRaw
 */
export async function loadVisibleAcademicDeadlineRows(prisma, loaded, fromRaw, toRaw) {
  if (String(loaded?.role || '').toUpperCase() === 'TEACHER') {
    return [];
  }

  const courseOffering = buildVisibleOfferingWhere(loaded);

  const [assignments, quizzes] = await Promise.all([
    prisma.assignment.findMany({
      where: { lifecycle: { publishStatus: 'PUBLISHED' }, due_date: { gte: fromRaw, lte: toRaw }, courseOffering },
      select: {
        id: true,
        title: true,
        due_date: true,
        courseOfferingId: true,
        courseOffering: { select: { publicId: true, course: { select: { code: true } } } },
      },
      orderBy: { due_date: 'asc' },
      take: 500,
    }),
    prisma.quiz.findMany({
      where: { is_draft: false, close_at: { not: null, gte: fromRaw, lte: toRaw }, courseOffering },
      select: {
        id: true,
        title: true,
        close_at: true,
        courseOfferingId: true,
        courseOffering: { select: { publicId: true, course: { select: { code: true } } } },
      },
      orderBy: { close_at: 'asc' },
      take: 500,
    }),
  ]);

  return [
    ...assignments.map((a) => ({
      kind: NOTIF_KIND.ASSIGNMENT,
      id: a.id,
      title: a.title,
      deadlineAt: a.due_date,
      courseOfferingId: a.courseOffering?.publicId ?? null,
      courseCode: a.courseOffering?.course?.code ?? null,
    })),
    ...quizzes.map((q) => ({
      kind: NOTIF_KIND.QUIZ,
      id: q.id,
      title: q.title,
      deadlineAt: q.close_at,
      courseOfferingId: q.courseOffering?.publicId ?? null,
      courseCode: q.courseOffering?.course?.code ?? null,
    })),
  ];
}

/** Shape an announcement deadline row into the unified calendar-row form. */
function announcementRowToUnified(r) {
  return {
    kind: NOTIF_KIND.ANNOUNCEMENT,
    id: r.id,
    title: r.title,
    content: r.content,
    deadlineAt: r.deadlineAt,
    targetType: r.targetType,
    targeting: {
      facultyId: r.facultyId,
      departmentId: r.departmentId,
      batchId: r.batchId,
      sectionId: r.sectionId,
    },
  };
}

/**
 * All deadlines visible to the caller — announcements + academic — merged and
 * sorted by deadline. This is the single feed behind the calendar page, the
 * dashboard widget, and the ICS export.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ userId: number, role: string }} loaded scope from loadUserAnnouncementScope
 * @param {unknown} visibilityUser announcement-visibility user
 * @param {Date} fromRaw
 * @param {Date} toRaw
 */
export async function loadAllVisibleDeadlineRows(prisma, loaded, visibilityUser, fromRaw, toRaw) {
  const [announcementRows, academicRows] = await Promise.all([
    loadVisibleCalendarDeadlineRows(prisma, visibilityUser, fromRaw, toRaw),
    loadVisibleAcademicDeadlineRows(prisma, loaded, fromRaw, toRaw),
  ]);
  return [...announcementRows.map(announcementRowToUnified), ...academicRows]
    .filter((r) => r.deadlineAt)
    .sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime());
}
