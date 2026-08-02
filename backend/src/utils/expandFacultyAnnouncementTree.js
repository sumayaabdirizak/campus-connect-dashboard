/**
 * Expand faculty → department → batch → section ids for announcement scope.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number[]} facultyIds
 */
export async function expandFacultyAnnouncementTree(prisma, facultyIds) {
  const facultyIdSet = new Set();
  const departmentIds = new Set();
  const batchIds = new Set();
  const sectionIds = new Set();

  const ids = [
    ...new Set(
      [...facultyIds].map(Number).filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  for (const fid of ids) facultyIdSet.add(fid);
  if (ids.length === 0) {
    return {
      facultyIds: [],
      departmentIds: [],
      batchIds: [],
      sectionIds: [],
    };
  }

  const departments = await prisma.department.findMany({
    where: { facultyId: { in: ids } },
    select: { id: true },
  });
  for (const department of departments) departmentIds.add(department.id);

  const departmentIdList = [...departmentIds];
  if (departmentIdList.length > 0) {
    const batches = await prisma.batch.findMany({
      where: { program: { departmentId: { in: departmentIdList } } },
      select: { id: true },
    });
    for (const batch of batches) batchIds.add(batch.id);

    const batchIdList = [...batchIds];
    if (batchIdList.length > 0) {
      const sections = await prisma.batchSection.findMany({
        where: { batchId: { in: batchIdList } },
        select: { id: true },
      });
      for (const section of sections) sectionIds.add(section.id);
    }
  }

  return {
    facultyIds: Array.from(facultyIdSet),
    departmentIds: Array.from(departmentIds),
    batchIds: Array.from(batchIds),
    sectionIds: Array.from(sectionIds),
  };
}
