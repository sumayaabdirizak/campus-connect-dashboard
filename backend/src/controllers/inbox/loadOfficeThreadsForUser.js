import { prisma } from '../../db/prisma.js';
import { isOfficeInboxOversight } from '../../../../shared/roles.js';

const OFFICE_THREAD_SELECT = {
  id: true,
  topic: true,
  reference: true,
  status: true,
  updatedAt: true,
  studentId: true,
  office: { select: { name: true, slug: true } },
  student: { select: { id: true, full_name: true } }
};

/**
 * Threads where the user is the student, plus threads for offices they staff.
 * Cross-faculty oversight (SUPER_ADMIN / ACADEMIC_OFFICE) sees all office threads.
 * Staff/oversight view wins when both apply (same thread id).
 */
export async function loadOfficeThreadsForUser(userId, platformRole) {
  if (isOfficeInboxOversight(platformRole)) {
    const all = await prisma.officeThread.findMany({
      select: OFFICE_THREAD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    return all.map((t) => ({ ...t, viewerIsStaff: true }));
  }

  const staffRows = await prisma.supportOfficeStaff.findMany({
    where: { userId },
    select: { officeId: true }
  });
  const staffOfficeIds = staffRows.map((r) => r.officeId);

  const [asStudent, asStaff] = await Promise.all([
    prisma.officeThread.findMany({
      where: { studentId: userId },
      select: OFFICE_THREAD_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    staffOfficeIds.length
      ? prisma.officeThread.findMany({
          where: { officeId: { in: staffOfficeIds } },
          select: OFFICE_THREAD_SELECT,
          orderBy: { updatedAt: 'desc' },
          take: 50
        })
      : Promise.resolve([])
  ]);

  const byId = new Map();
  for (const t of asStudent) {
    byId.set(t.id, { ...t, viewerIsStaff: false });
  }
  for (const t of asStaff) {
    byId.set(t.id, { ...t, viewerIsStaff: true });
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
