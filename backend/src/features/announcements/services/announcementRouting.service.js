import { prisma } from "../../../db/prisma.js";

/**
 * @param {import("@prisma/client").Announcement} announcement
 */
export async function resolveAnnouncementRoutingTargeting(announcement) {
  if (announcement.targetType === "ALL") {
    return {
      facultyId: null,
      departmentId: null,
      batchId: null,
      sectionId: null,
    };
  }

  if (announcement.targetType === "FACULTY") {
    return {
      facultyId: announcement.facultyId ?? null,
      departmentId: null,
      batchId: null,
      sectionId: null,
    };
  }

  if (announcement.targetType === "DEPARTMENT" && announcement.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: announcement.departmentId },
      select: { id: true, facultyId: true },
    });
    return {
      facultyId: department?.facultyId ?? null,
      departmentId: department?.id ?? null,
      batchId: null,
      sectionId: null,
    };
  }

  if (announcement.targetType === "BATCH" && announcement.batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: announcement.batchId },
      include: {
        program: {
          include: {
            department: {
              select: { id: true, facultyId: true },
            },
          },
        },
      },
    });
    return {
      facultyId: batch?.program?.department?.facultyId ?? null,
      departmentId: batch?.program?.department?.id ?? null,
      batchId: batch?.id ?? null,
      sectionId: null,
    };
  }

  if (announcement.targetType === "SECTION" && announcement.sectionId) {
    const section = await prisma.batchSection.findUnique({
      where: { id: announcement.sectionId },
      include: {
        batch: {
          include: {
            program: {
              include: {
                department: { select: { id: true, facultyId: true } },
              },
            },
          },
        },
      },
    });
    return {
      facultyId: section?.batch?.program?.department?.facultyId ?? null,
      departmentId: section?.batch?.program?.department?.id ?? null,
      batchId: section?.batch?.id ?? null,
      sectionId: section?.id ?? null,
    };
  }

  return {
    facultyId: announcement.facultyId ?? null,
    departmentId: announcement.departmentId ?? null,
    batchId: announcement.batchId ?? null,
    sectionId: announcement.sectionId ?? null,
  };
}

/** @param {import("@prisma/client").Announcement} announcement */
export async function getEffectiveFacultyIdForAnnouncement(announcement) {
  if (announcement.targetType === "ALL") {
    return announcement.facultyId ?? null;
  }
  const resolved = await resolveAnnouncementRoutingTargeting(announcement);
  return resolved.facultyId ?? announcement.facultyId ?? null;
}
