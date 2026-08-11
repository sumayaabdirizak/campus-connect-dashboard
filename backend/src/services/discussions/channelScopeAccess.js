/**
 * Restricts hybrid faculty-server channels so users only see:
 * - "Common" channels (no academic scope on the row, e.g. #general, #announcements)
 * - Scoped channels that match their faculty / department / batch / section
 *   (plus dean/faculty-admin coverage for their faculty tree, and lecturers for
 *   departments / batches / sections they teach).
 *
 * All allow/deny logic lives in {@link usersMayAccessDiscussionChannelScope}
 * (the batched form). The single-user helper is a thin wrapper over it so
 * there is exactly one place to update when scope rules change.
 */

import { prisma } from "../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES } from "./policy.js";

/**
 * Batched: given many userIds and a SINGLE channel scope, returns the Set of
 * userIds allowed to see it. Uses a constant number of queries (one user
 * fetch + at most a couple of scope-resolution / membership fetches) instead
 * of O(N) per-user lookups.
 *
 * @param {{ userIds: number[], scopeType: string | null, scopeId: number | null, prismaClient?: object }} args
 * @returns {Promise<Set<number>>}
 */
export async function usersMayAccessDiscussionChannelScope({
  userIds,
  scopeType,
  scopeId,
  prismaClient = prisma,
}) {
  const ids = Array.from(
    new Set((userIds ?? []).map(Number).filter((n) => Number.isInteger(n)))
  );
  // No academic scope (common channel) → everyone is allowed.
  if (scopeType == null || scopeId == null) return new Set(ids);

  const type = String(scopeType).toUpperCase();
  const sid = Number(scopeId);
  if (!Number.isInteger(sid) || sid <= 0) return new Set();
  if (ids.length === 0) return new Set();

  const users = await prismaClient.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      role: { select: { name: true } },
      studentProfile: { select: { facultyId: true, departmentId: true } },
      lecturerProfile: {
        select: {
          departmentId: true,
          faculties: { select: { facultyId: true } },
        },
      },
      deanProfile: { select: { facultyId: true } },
    },
  });

  // Resolve the scope's owning faculty once (for dean coverage).
  let scopeFacultyId = null;
  if (type === DISCUSSION_SCOPE_TYPES.FACULTY) {
    scopeFacultyId = sid;
  } else if (type === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
    const dept = await prismaClient.department.findUnique({
      where: { id: sid },
      select: { facultyId: true },
    });
    scopeFacultyId = dept?.facultyId ?? null;
  } else if (type === DISCUSSION_SCOPE_TYPES.BATCH) {
    const batch = await prismaClient.batch.findUnique({
      where: { id: sid },
      select: { program: { select: { department: { select: { facultyId: true } } } } },
    });
    scopeFacultyId = batch?.program?.department?.facultyId ?? null;
  } else if (type === DISCUSSION_SCOPE_TYPES.SECTION) {
    const sec = await prismaClient.batchSection.findUnique({
      where: { id: sid },
      select: {
        batch: { select: { program: { select: { department: { select: { facultyId: true } } } } } },
      },
    });
    scopeFacultyId = sec?.batch?.program?.department?.facultyId ?? null;
  }

  // Pre-fetch enrollment / teaching matches once for BATCH and SECTION scopes.
  const studentMatch = new Set(); // userIds enrolled in the batch/section
  const teacherMatch = new Set(); // userIds teaching the batch/section
  if (type === DISCUSSION_SCOPE_TYPES.BATCH) {
    const regs = await prismaClient.studentRegistration.findMany({
      where: { studentId: { in: ids }, batchSection: { batchId: sid } },
      select: { studentId: true },
    });
    for (const r of regs) studentMatch.add(r.studentId);
    const taught = await prismaClient.courseOffering.findMany({
      where: { teacherId: { in: ids }, section: { batchId: sid } },
      select: { teacherId: true },
    });
    for (const t of taught) teacherMatch.add(t.teacherId);
  } else if (type === DISCUSSION_SCOPE_TYPES.SECTION) {
    const regs = await prismaClient.studentRegistration.findMany({
      where: { studentId: { in: ids }, batchSectionId: sid },
      select: { studentId: true },
    });
    for (const r of regs) studentMatch.add(r.studentId);
    const taught = await prismaClient.courseOffering.findMany({
      where: { teacherId: { in: ids }, sectionId: sid },
      select: { teacherId: true },
    });
    for (const t of taught) teacherMatch.add(t.teacherId);
  }

  const allowed = new Set();
  for (const u of users) {
    const globalRole = String(u.role?.name || "").toUpperCase();
    if (globalRole === "SUPER_ADMIN") {
      allowed.add(u.id);
      continue;
    }

    const deanFacultyId = u.deanProfile?.facultyId ?? null;
    const staffFacultyId = deanFacultyId;
    const staffCoversScope =
      staffFacultyId != null && scopeFacultyId != null && scopeFacultyId === staffFacultyId;

    let ok;
    if (type === DISCUSSION_SCOPE_TYPES.FACULTY) {
      const lectFac = u.lecturerProfile?.faculties?.map((f) => f.facultyId) ?? [];
      ok =
        u.studentProfile?.facultyId === sid ||
        lectFac.includes(sid) ||
        deanFacultyId === sid;
    } else if (type === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
      ok =
        u.studentProfile?.departmentId === sid ||
        u.lecturerProfile?.departmentId === sid ||
        staffCoversScope;
    } else if (
      type === DISCUSSION_SCOPE_TYPES.BATCH ||
      type === DISCUSSION_SCOPE_TYPES.SECTION
    ) {
      ok = studentMatch.has(u.id) || teacherMatch.has(u.id) || staffCoversScope;
    } else {
      // Unknown scope type — deny by default (fail closed).
      ok = false;
    }
    if (ok) allowed.add(u.id);
  }

  return allowed;
}

/**
 * Single-user convenience wrapper around {@link usersMayAccessDiscussionChannelScope}.
 * Prefer the batched form directly when checking many users against one scope
 * (e.g. filtering a membership list) — this wrapper still does one query
 * round-trip per call, it just avoids duplicating the allow/deny rules.
 *
 * @param {{ userId: number, scopeType: string | null, scopeId: number | null, prismaClient?: object }} args
 */
export async function userMayAccessDiscussionChannelScope({
  userId,
  scopeType,
  scopeId,
  prismaClient = prisma,
}) {
  const allowed = await usersMayAccessDiscussionChannelScope({
    userIds: [userId],
    scopeType,
    scopeId,
    prismaClient,
  });
  return allowed.has(Number(userId));
}

/**
 * Filters server membership rows to users allowed in a channel's academic scope.
 * Common channels (no scope) pass through unchanged.
 *
 * @param {Array<{ userId: number }>} rows
 * @param {{ scopeType?: string | null, scopeId?: number | null } | null | undefined} channel
 * @param {object} [prismaClient]
 */
export async function filterMembershipRowsByChannelScope(rows, channel, prismaClient = prisma) {
  if (!channel?.scopeType || channel?.scopeId == null || rows.length === 0) return rows;
  const allowed = await usersMayAccessDiscussionChannelScope({
    userIds: rows.map((row) => row.userId),
    scopeType: channel.scopeType,
    scopeId: channel.scopeId,
    prismaClient,
  });
  return rows.filter((row) => allowed.has(row.userId));
}
