import { prisma } from '../../../db/prisma.js';
import { safe } from './safe.js';

export async function buildUserSegmentChart(facultyId) {
  if (facultyId) {
    const groups = await safe(
      () =>
        prisma.studentProfile.groupBy({
          by: ['departmentId'],
          where: { facultyId },
          _count: { _all: true },
        }),
      []
    );
    const deptIds = groups.map((g) => g.departmentId).filter(Boolean);
    const departments = deptIds.length
      ? await prisma.department.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const nameById = new Map(departments.map((d) => [d.id, d.name]));
    return {
      label: 'Department',
      rows: groups
        .map((g) => ({
          name: nameById.get(g.departmentId) ?? `Dept ${g.departmentId}`,
          users: g._count._all,
        }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 8),
    };
  }

  const groups = await safe(
    () =>
      prisma.studentProfile.groupBy({
        by: ['facultyId'],
        _count: { _all: true },
      }),
    []
  );
  const facultyIds = groups.map((g) => g.facultyId).filter(Boolean);
  const faculties = facultyIds.length
    ? await prisma.faculty.findMany({
        where: { id: { in: facultyIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(faculties.map((f) => [f.id, f.name]));
  return {
    label: 'Faculty',
    rows: groups
      .map((g) => ({
        name: nameById.get(g.facultyId) ?? `Faculty ${g.facultyId}`,
        users: g._count._all,
      }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 8),
  };
}
