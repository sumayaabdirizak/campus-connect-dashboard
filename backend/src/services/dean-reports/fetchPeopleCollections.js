import { prisma } from '../../db/prisma.js';
import { safe } from './helpers.js';

export async function fetchPeopleCollections({ facultyId, since, prevSince, filters = {} }) {
  const departmentId = filters.departmentId ? Number(filters.departmentId) : null;
  const batchId = filters.batchId ? Number(filters.batchId) : null;
  const sectionId = filters.sectionId ? Number(filters.sectionId) : null;
  const levelRaw = filters.studentLevel
    ? String(filters.studentLevel).toUpperCase().replace(/\s+/g, '_')
    : null;
  const programLevel =
    levelRaw === 'UNDERGRADUATE' || levelRaw === 'POSTGRADUATE' ? levelRaw : null;

  const batchScope = {
    program: {
      department: {
        facultyId,
        ...(departmentId ? { id: departmentId } : {}),
      },
      ...(programLevel ? { level: programLevel } : {}),
    },
    ...(batchId ? { id: batchId } : {}),
  };

  const registrationScope = {
    batchSection: {
      ...(sectionId ? { id: sectionId } : {}),
      batch: batchScope,
    },
  };

  const studentRegistrationFilter =
    batchId || sectionId || programLevel
      ? {
          studentRegistrations: {
            some: {
              ...(sectionId ? { batchSectionId: sectionId } : {}),
              ...(batchId && !sectionId
                ? { batchSection: { batchId } }
                : {}),
              ...(!batchId && !sectionId
                ? {
                    batchSection: {
                      batch: {
                        program: {
                          ...(departmentId ? { departmentId } : {}),
                          ...(programLevel ? { level: programLevel } : {}),
                        },
                      },
                    },
                  }
                : {}),
            },
          },
        }
      : {};

  const [studentProfiles, registrations, prevRegistrations, teachers] = await Promise.all([
    safe(
      () =>
        prisma.studentProfile.findMany({
          where: {
            facultyId,
            ...(departmentId ? { departmentId } : {}),
            ...studentRegistrationFilter,
          },
          select: {
            id: true,
            departmentId: true,
            user: {
              select: {
                id: true,
                full_name: true,
                status: true,
                studentRegistrations: {
                  select: {
                    batchSection: {
                      select: {
                        batch: {
                          select: {
                            program: { select: { level: true, name: true } },
                          },
                        },
                      },
                    },
                  },
                  take: 1,
                },
              },
            },
          },
        }),
      []
    ),
    safe(
      () =>
        prisma.studentRegistration.findMany({
          where: {
            ...registrationScope,
            created_at: { gte: since },
          },
          select: { created_at: true },
        }),
      []
    ),
    safe(
      () =>
        prisma.studentRegistration.findMany({
          where: {
            ...registrationScope,
            created_at: { gte: prevSince, lt: since },
          },
          select: { created_at: true },
        }),
      []
    ),
    safe(
      () =>
        prisma.user.findMany({
          where: {
            role: { name: 'TEACHER' },
            lecturerProfile: {
              faculties: { some: { facultyId } },
              ...(departmentId ? { departmentId } : {}),
            },
          },
          select: {
            id: true,
            full_name: true,
            lecturerProfile: {
              select: {
                department: { select: { id: true, name: true } },
              },
            },
          },
        }),
      []
    ),
  ]);

  return { studentProfiles, registrations, prevRegistrations, teachers };
}
