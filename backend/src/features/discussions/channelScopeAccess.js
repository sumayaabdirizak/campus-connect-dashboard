/**
 * Restricts hybrid faculty-server channels so users only see:
 * - "Common" channels (no academic scope on the row, e.g. #general, #announcements)
 * - Scoped channels that match their faculty / department / batch / section
 *   (plus dean/faculty-admin coverage for their faculty tree, and lecturers for
 *   departments / batches / sections they teach).
 */

import { prisma } from "../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES } from "./policy.js";

/**
 * @param {{ userId: number, scopeType: string | null, scopeId: number | null, prismaClient?: object }} args
 */
export async function userMayAccessDiscussionChannelScope({
  userId,
  scopeType,
  scopeId,
  prismaClient = prisma,
}) {
  if (scopeType == null || scopeId == null) return true;

  const type = String(scopeType).toUpperCase();
  const sid = Number(scopeId);
  if (!Number.isInteger(sid) || sid <= 0) return false;

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      role: { select: { name: true } },
      studentProfile: { select: { facultyId: true, departmentId: true } },
      lecturerProfile: {
        select: {
          departmentId: true,
          faculties: { select: { facultyId: true } },
        },
      },
      deanProfile: { select: { facultyId: true } },
      facultyAdminProfile: { select: { faculty_id: true } },
    },
  });
  if (!user) return false;

  const globalRole = String(user.role?.name || "").toUpperCase();
  if (globalRole === "SUPER_ADMIN") return true;

  const deanFacultyId = user.deanProfile?.facultyId ?? null;
  const adminFacultyId = user.facultyAdminProfile?.faculty_id ?? null;
  const staffFacultyId = deanFacultyId ?? adminFacultyId;

  if (type === DISCUSSION_SCOPE_TYPES.FACULTY) {
    if (user.studentProfile?.facultyId === sid) return true;
    const lectFac = user.lecturerProfile?.faculties?.map((f) => f.facultyId) ?? [];
    if (lectFac.includes(sid)) return true;
    if (deanFacultyId === sid) return true;
    if (adminFacultyId === sid) return true;
    return false;
  }

  if (type === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
    if (user.studentProfile?.departmentId === sid) return true;
    if (user.lecturerProfile?.departmentId === sid) return true;
    if (staffFacultyId != null) {
      const dept = await prismaClient.department.findUnique({
        where: { id: sid },
        select: { facultyId: true },
      });
      if (dept?.facultyId === staffFacultyId) return true;
    }
    return false;
  }

  if (type === DISCUSSION_SCOPE_TYPES.BATCH) {
    const regs = await prismaClient.studentRegistration.findMany({
      where: { studentId: userId },
      select: { batchSection: { select: { batchId: true } } },
    });
    for (const r of regs) {
      if (r.batchSection?.batchId === sid) return true;
    }
    const taught = await prismaClient.courseOffering.findFirst({
      where: { teacherId: userId, section: { batchId: sid } },
      select: { id: true },
    });
    if (taught) return true;
    if (staffFacultyId != null) {
      const batch = await prismaClient.batch.findUnique({
        where: { id: sid },
        select: {
          program: {
            select: {
              department: {
                select: { facultyId: true },
              },
            },
          },
        },
      });
      const fid = batch?.program?.department?.facultyId;
      if (fid != null && fid === staffFacultyId) return true;
    }
    return false;
  }

  if (type === DISCUSSION_SCOPE_TYPES.SECTION) {
    const regs = await prismaClient.studentRegistration.findMany({
      where: { studentId: userId },
      select: { batchSectionId: true },
    });
    for (const r of regs) {
      if (r.batchSectionId === sid) return true;
    }
    const taughtSec = await prismaClient.courseOffering.findFirst({
      where: { teacherId: userId, sectionId: sid },
      select: { id: true },
    });
    if (taughtSec) return true;
    if (staffFacultyId != null) {
      const sec = await prismaClient.batchSection.findUnique({
        where: { id: sid },
        select: {
          batch: {
            select: {
              program: {
                select: {
                  department: {
                    select: { facultyId: true },
                  },
                },
              },
            },
          },
        },
      });
      const fid = sec?.batch?.program?.department?.facultyId;
      if (fid != null && fid === staffFacultyId) return true;
    }
    return false;
  }

  return true;
}
