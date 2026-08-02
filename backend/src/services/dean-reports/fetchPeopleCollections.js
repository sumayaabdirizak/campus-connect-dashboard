import { prisma } from '../../db/prisma.js';
import { safe } from './helpers.js';

export async function fetchPeopleCollections({ facultyId, since, prevSince, filters = {} }) {
  const departmentId = filters.departmentId ? Number(filters.departmentId) : null;

  const registrationScope = {
    batchSection: {
      batch: {
        program: {
          department: {
            facultyId,
            ...(departmentId ? { id: departmentId } : {}),
          },
        },
      },
    },
  };

  const [studentProfiles, registrations, prevRegistrations, teachers] = await Promise.all([
    safe(
      () =>
        prisma.studentProfile.findMany({
          where: {
            facultyId,
            ...(departmentId ? { departmentId } : {}),
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
