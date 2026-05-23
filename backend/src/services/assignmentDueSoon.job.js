import { prisma } from "../db/prisma.js";
import { pushToUsers } from "./pushNotifier.service.js";

/**
 * Once-per-day cron entry point. Pushes a "due tomorrow" notification to
 * every enrolled student for assignments whose due_date falls within the
 * next 24 h (but more than 0 h away). Idempotent at the granularity of a
 * single day — runs more than once a day and the second push will simply
 * be deduped at the OS level via the shared `tag`.
 *
 * Wire to your scheduler of choice (node-cron, a separate worker, Vercel
 * cron, etc.) — this module just exports the function.
 */
export async function runAssignmentDueSoon(now = new Date()) {
  const horizonStart = new Date(now);
  const horizonEnd = new Date(now.getTime() + 24 * 3600_000);

  const assignments = await prisma.assignment.findMany({
    where: {
      is_draft: false,
      due_date: { gt: horizonStart, lte: horizonEnd },
    },
    select: {
      id: true,
      title: true,
      due_date: true,
      courseOfferingId: true,
      courseOffering: {
        select: {
          sectionId: true,
          section: {
            select: {
              studentRegistrations: { select: { studentId: true } },
            },
          },
        },
      },
    },
  });

  let pushed = 0;
  for (const a of assignments) {
    const studentIds = a.courseOffering.section?.studentRegistrations.map((r) => r.studentId) ?? [];
    if (studentIds.length === 0) continue;
    await pushToUsers(studentIds, {
      title: 'Assignment due soon',
      body: `${a.title} · due ${a.due_date.toLocaleString()}`,
      url: `/dashboard/courses/${a.courseOfferingId}?tab=assignments`,
      tag: `due-${a.id}-${a.due_date.toISOString().slice(0, 10)}`,
    });
    pushed += studentIds.length;
  }

  return { scanned: assignments.length, pushed };
}
