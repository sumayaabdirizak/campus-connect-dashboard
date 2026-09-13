import { prisma } from '../../db/prisma.js';

/**
 * The pickable subjects for a scope, in one shape: `{ id, label, sublabel }`.
 *
 * Deliberately served from the reports router rather than reusing the five
 * separate list endpoints — those return different shapes, page differently
 * and carry their own role rules, which would leak into every report page.
 */
export async function listSubjects(scope, search = '', { teacherId = null } = {}) {
  const q = String(search || '').trim();
  const contains = q ? { contains: q, mode: 'insensitive' } : undefined;
  const tid = teacherId != null ? Number(teacherId) : null;

  switch (scope) {
    case 'course': {
      const rows = await prisma.courseOffering.findMany({
        where: {
          ...(tid != null ? { teacherId: tid } : {}),
          ...(contains
            ? {
                OR: [
                  { course: { name: contains } },
                  { course: { code: contains } },
                ],
              }
            : {}),
        },
        select: {
          publicId: true,
          course: { select: { code: true, name: true } },
          section: { select: { name: true, batch: { select: { name: true } } } },
          teacher: { select: { full_name: true } },
        },
        orderBy: { id: 'desc' },
        take: 200,
      });
      return rows.map((r) => ({
        id: r.publicId,
        label: `${r.course.code} — ${r.course.name}`,
        sublabel: `${r.section.batch.name} · ${r.section.name}${
          r.teacher ? ` · ${r.teacher.full_name}` : ''
        }`,
      }));
    }

    case 'teacher': {
      // Only staff who actually run a course — an empty report helps nobody.
      // When teacherId is set (lecturer session), return only that user.
      const rows = await prisma.user.findMany({
        where: {
          ...(tid != null
            ? { id: tid }
            : { teacherOfferings: { some: {} } }),
          ...(contains ? { OR: [{ full_name: contains }, { email: contains }] } : {}),
        },
        select: {
          id: true,
          full_name: true,
          email: true,
          number: true,
          _count: { select: { teacherOfferings: true } },
        },
        orderBy: { full_name: 'asc' },
        take: 200,
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.full_name,
        sublabel: `${r.number ?? r.email} · ${r._count.teacherOfferings} course${
          r._count.teacherOfferings === 1 ? '' : 's'
        }`,
      }));
    }

    case 'student': {
      const rows = await prisma.user.findMany({
        where: {
          studentRegistrations: { some: {} },
          ...(contains ? { OR: [{ full_name: contains }, { number: contains }] } : {}),
        },
        select: {
          id: true,
          full_name: true,
          number: true,
          studentRegistrations: {
            select: { batchSection: { select: { name: true, batch: { select: { name: true } } } } },
            take: 1,
          },
        },
        orderBy: { full_name: 'asc' },
        take: 200,
      });
      return rows.map((r) => {
        const reg = r.studentRegistrations[0];
        return {
          id: r.id,
          label: r.full_name,
          sublabel: [r.number, reg?.batchSection?.batch?.name, reg?.batchSection?.name]
            .filter(Boolean)
            .join(' · '),
        };
      });
    }

    case 'batch': {
      const rows = await prisma.batch.findMany({
        where: contains ? { name: contains } : undefined,
        select: {
          id: true,
          name: true,
          status: true,
          program: { select: { code: true, name: true } },
          _count: { select: { sections: true } },
        },
        orderBy: { name: 'asc' },
        take: 200,
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: `${r.program?.code ?? '—'} · ${r._count.sections} section${
          r._count.sections === 1 ? '' : 's'
        } · ${r.status}`,
      }));
    }

    case 'section': {
      const rows = await prisma.batchSection.findMany({
        where: contains
          ? {
              OR: [
                { name: contains },
                { batch: { name: contains } },
                { batch: { program: { code: contains } } },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          batch: { select: { name: true, program: { select: { code: true } } } },
          _count: { select: { studentRegistrations: true } },
        },
        orderBy: [{ batch: { name: 'asc' } }, { name: 'asc' }],
        take: 200,
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: `${r.batch?.name ?? '—'} · ${r.batch?.program?.code ?? '—'} · ${
          r._count.studentRegistrations
        } student${r._count.studentRegistrations === 1 ? '' : 's'}`,
      }));
    }

    case 'faculty': {
      const rows = await prisma.faculty.findMany({
        where: contains ? { OR: [{ name: contains }, { code: contains }] } : undefined,
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { departments: true } },
        },
        orderBy: { name: 'asc' },
        take: 200,
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: `${r.code} · ${r._count.departments} department${
          r._count.departments === 1 ? '' : 's'
        }`,
      }));
    }

    default:
      return [];
  }
}
