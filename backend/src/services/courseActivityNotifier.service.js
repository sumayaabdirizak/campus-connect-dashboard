import { prisma } from '../db/prisma.js';
import { pushToUsers } from './pushNotifier.service.js';
import { deliverCourseActivity } from './courseActivityDeliver.js';

/**
 * Notify enrolled students: in-app + email + push (best-effort).
 * @param {{
 *   courseOfferingId: number;
 *   kind: import('@prisma/client').CourseActivityKind;
 *   title: string;
 *   body: string;
 *   href: string;
 *   tag?: string;
 *   ctaLabel?: string;
 *   userIds?: number[];
 * }} opts
 * When `userIds` is set, only those enrolled students are notified.
 */
export async function notifyCourseOfferingStudents(opts) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: opts.courseOfferingId },
    select: {
      id: true,
      course: { select: { code: true, name: true } },
      section: {
        select: {
          studentRegistrations: {
            select: {
              student: { select: { id: true, email: true, full_name: true } },
            },
          },
        },
      },
    },
  });
  if (!offering) return { notified: 0 };

  let students =
    offering.section?.studentRegistrations?.map((r) => r.student).filter(Boolean) ??
    [];
  if (opts.userIds?.length) {
    const allow = new Set(opts.userIds.map(Number));
    students = students.filter((s) => allow.has(Number(s.id)));
  }
  if (students.length === 0) return { notified: 0 };

  const courseLabel =
    offering.course?.code || offering.course?.name || 'Your course';
  const courseName =
    offering.course?.code && offering.course?.name ? offering.course.name : undefined;
  const href = opts.href.startsWith('/') ? opts.href : `/${opts.href}`;

  await prisma.courseActivityNotification.createMany({
    data: students.map((s) => ({
      userId: s.id,
      courseOfferingId: offering.id,
      kind: opts.kind,
      title: opts.title,
      body: opts.body,
      href,
    })),
  });

  await deliverCourseActivity({
    students,
    courseLabel,
    courseName,
    title: opts.title,
    body: opts.body,
    href,
    ctaLabel: opts.ctaLabel || 'Open',
    tag: opts.tag,
  });

  pushToUsers(
    students.map((s) => s.id),
    { title: opts.title, body: opts.body, url: href, tag: opts.tag }
  ).catch(() => {});

  return { notified: students.length };
}

/**
 * Notify the offering's teacher: in-app + email + push (best-effort).
 * Mirrors {@link notifyCourseOfferingStudents} but targets the single teacher
 * assigned to the offering — used for "a student submitted work" alerts,
 * which previously reached the teacher only via the live-monitor socket feed.
 * @param {{
 *   courseOfferingId: number;
 *   kind: import('@prisma/client').CourseActivityKind;
 *   title: string;
 *   body: string;
 *   href: string;
 *   tag?: string;
 *   ctaLabel?: string;
 * }} opts
 */
export async function notifyCourseOfferingTeacher(opts) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: opts.courseOfferingId },
    select: {
      id: true,
      course: { select: { code: true, name: true } },
      teacher: { select: { id: true, email: true, full_name: true } },
    },
  });
  if (!offering?.teacher) return { notified: 0 };

  const teacher = offering.teacher;
  const courseLabel = offering.course?.code || offering.course?.name || 'Your course';
  const courseName =
    offering.course?.code && offering.course?.name ? offering.course.name : undefined;
  const href = opts.href.startsWith('/') ? opts.href : `/${opts.href}`;

  await prisma.courseActivityNotification.create({
    data: {
      userId: teacher.id,
      courseOfferingId: offering.id,
      kind: opts.kind,
      title: opts.title,
      body: opts.body,
      href,
    },
  });

  await deliverCourseActivity({
    students: [teacher],
    courseLabel,
    courseName,
    title: opts.title,
    body: opts.body,
    href,
    ctaLabel: opts.ctaLabel || 'Open',
    tag: opts.tag,
  });

  pushToUsers([teacher.id], { title: opts.title, body: opts.body, url: href, tag: opts.tag }).catch(
    () => {}
  );

  return { notified: 1 };
}
