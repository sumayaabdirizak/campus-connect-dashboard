/**
 * Load faculty / department / batch / section ids for announcement visibility and Socket.IO rooms.
 * Mirrors HTTP GET scope so REST filters and realtime rooms stay aligned.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} userId
 * @returns {Promise<{ userId: number, full_name: string, role: string, status: string, facultyIds: number[], departmentIds: number[], batchIds: number[], sectionIds: number[] } | null>}
 */
import { expandFacultyAnnouncementTree } from './expandFacultyAnnouncementTree.js';

// The announcements page fires list/unread-count/drafts-count requests in
// parallel, and each independently needs this scope — without sharing, three
// concurrent requests do three copies of the same deep-join lookup. A short
// TTL plus in-flight de-duplication collapses those into one DB round trip
// without risking stale enrollment data for more than a moment.
// Kept short: this only needs to survive the handful of milliseconds between
// the announcements page's parallel list/unread/drafts requests, not minutes.
// invalidateUserAnnouncementScope() covers the known mutation path (section
// assignment); a short TTL bounds staleness everywhere else that isn't wired up yet.
const SCOPE_CACHE_TTL_MS = 8_000;
const scopeCache = new Map(); // userId -> { value, expiresAt }
const scopeInFlight = new Map(); // userId -> Promise

/** Call after any admin action that changes a user's role/faculty/department/batch/section,
 * so the next scope lookup doesn't serve a stale pre-change value for up to SCOPE_CACHE_TTL_MS. */
export function invalidateUserAnnouncementScope(userId) {
  scopeCache.delete(userId);
  scopeInFlight.delete(userId);
}

export async function loadUserAnnouncementScope(prisma, userId) {
  const cached = scopeCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const inFlight = scopeInFlight.get(userId);
  if (inFlight) return inFlight;

  const promise = loadUserAnnouncementScopeUncached(prisma, userId)
    .then((value) => {
      scopeCache.set(userId, { value, expiresAt: Date.now() + SCOPE_CACHE_TTL_MS });
      return value;
    })
    .finally(() => {
      scopeInFlight.delete(userId);
    });

  scopeInFlight.set(userId, promise);
  return promise;
}

async function loadUserAnnouncementScopeUncached(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      studentProfile: true,
      lecturerProfile: {
        include: {
          faculties: { select: { facultyId: true } },
        },
      },
      deanProfile: true,
      studentRegistrations: {
        include: {
          batchSection: {
            include: {
              batch: {
                include: {
                  program: { select: { departmentId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const roleName = String(user.role?.name || '').toUpperCase();

  if (roleName === 'DEAN' && user.deanProfile?.facultyId) {
    const tree = await expandFacultyAnnouncementTree(prisma, [user.deanProfile.facultyId]);
    return {
      userId: user.id,
      full_name: user.full_name,
      role: user.role.name,
      status: user.status,
      ...tree,
    };
  }

  const facultyIds = new Set();
  const departmentIds = new Set();
  const batchIds = new Set();
  const sectionIds = new Set();

  if (user.studentProfile?.facultyId) facultyIds.add(user.studentProfile.facultyId);
  if (user.studentProfile?.departmentId) departmentIds.add(user.studentProfile.departmentId);

  if (user.lecturerProfile?.departmentId) departmentIds.add(user.lecturerProfile.departmentId);
  for (const f of user.lecturerProfile?.faculties ?? []) {
    if (f.facultyId) facultyIds.add(f.facultyId);
  }

  if (user.deanProfile?.facultyId) facultyIds.add(user.deanProfile.facultyId);

  for (const registration of user.studentRegistrations ?? []) {
    if (registration.batchSectionId) sectionIds.add(registration.batchSectionId);
    const batch = registration.batchSection?.batch;
    if (batch?.id) batchIds.add(batch.id);
    if (batch?.program?.departmentId) departmentIds.add(batch.program.departmentId);
  }

  return {
    userId: user.id,
    full_name: user.full_name,
    role: user.role.name,
    status: user.status,
    facultyIds: Array.from(facultyIds),
    departmentIds: Array.from(departmentIds),
    batchIds: Array.from(batchIds),
    sectionIds: Array.from(sectionIds),
  };
}
