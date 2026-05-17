import { resolveAnnouncementRoutingTargeting } from "./announcementRouting.service.js";

/**
 * Best-effort list of user IDs that should receive a direct `user:<id>` socket event.
 * Scope rooms remain the primary delivery mechanism; this augments open tabs.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {import("@prisma/client").Announcement} row
 * @returns {Promise<number[]>}
 */
export async function findAnnouncementRecipientUserIds(prisma, row) {
  const roles = Array.isArray(row.targetRoles) && row.targetRoles.length > 0 ? row.targetRoles : null;
  if (!roles) return [];

  const roleRecords = await prisma.role.findMany({
    where: { name: { in: roles } },
    select: { id: true },
  });
  const roleIds = roleRecords.map((r) => r.id);
  if (!roleIds.length) return [];

  const resolved = await resolveAnnouncementRoutingTargeting(row);
  const scopeWhere = await buildScopeOverlapWhere(row, resolved);
  if (scopeWhere == null) return [];

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      roleId: { in: roleIds },
      ...scopeWhere,
    },
    select: { id: true },
    take: 5000,
  });
  return users.map((u) => u.id);
}

/**
 * @param {import("@prisma/client").Announcement} row
 * @param {Awaited<ReturnType<typeof resolveAnnouncementRoutingTargeting>>} resolved
 * @returns {Promise<import("@prisma/client").Prisma.UserWhereInput | null>}
 */
async function buildScopeOverlapWhere(row, resolved) {
  switch (row.targetType) {
    case "ALL": {
      const fid = row.facultyId ?? resolved.facultyId;
      if (fid == null) return null;
      return {
        OR: [
          { studentProfile: { facultyId: fid } },
          { deanProfile: { facultyId: fid } },
          { lecturerProfile: { faculties: { some: { facultyId: fid } } } },
          { facultyAdminProfile: { faculty_id: fid } },
        ],
      };
    }
    case "FACULTY": {
      const fid = row.facultyId ?? resolved.facultyId;
      if (fid == null) return null;
      return {
        OR: [
          { studentProfile: { facultyId: fid } },
          { deanProfile: { facultyId: fid } },
          { lecturerProfile: { faculties: { some: { facultyId: fid } } } },
          { facultyAdminProfile: { faculty_id: fid } },
        ],
      };
    }
    case "DEPARTMENT": {
      const did = row.departmentId ?? resolved.departmentId;
      if (did == null) return null;
      return {
        OR: [
          { studentProfile: { departmentId: did } },
          { lecturerProfile: { departmentId: did } },
        ],
      };
    }
    case "BATCH": {
      const bid = row.batchId ?? resolved.batchId;
      if (bid == null) return null;
      return {
        OR: [
          {
            studentRegistrations: {
              some: { batchSection: { batchId: bid } },
            },
          },
          {
            teacherOfferings: {
              some: { section: { batchId: bid } },
            },
          },
        ],
      };
    }
    case "SECTION": {
      const sid = row.sectionId ?? resolved.sectionId;
      if (sid == null) return null;
      return {
        OR: [
          {
            studentRegistrations: {
              some: { batchSectionId: sid },
            },
          },
          {
            teacherOfferings: {
              some: { sectionId: sid },
            },
          },
        ],
      };
    }
    default:
      return null;
  }
}
