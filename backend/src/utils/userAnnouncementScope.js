/**
 * Load faculty / department / batch / section ids for announcement visibility and Socket.IO rooms.
 * Mirrors HTTP GET scope so REST filters and realtime rooms stay aligned.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} userId
 * @returns {Promise<{ userId: number, role: string, status: string, facultyIds: number[], departmentIds: number[], batchIds: number[], sectionIds: number[] } | null>}
 */
export async function loadUserAnnouncementScope(prisma, userId) {
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

  const facultyIds = new Set();
  const departmentIds = new Set();
  const batchIds = new Set();
  const sectionIds = new Set();

  if (user.role.name === "DEAN" && user.deanProfile?.facultyId) {
    const deanFacultyId = user.deanProfile.facultyId;
    facultyIds.add(deanFacultyId);

    const departments = await prisma.department.findMany({
      where: { facultyId: deanFacultyId },
      select: { id: true },
    });
    for (const department of departments) departmentIds.add(department.id);

    const departmentIdList = departments.map((d) => d.id);
    if (departmentIdList.length > 0) {
      const batches = await prisma.batch.findMany({
        where: {
          program: {
            departmentId: { in: departmentIdList },
          },
        },
        select: { id: true },
      });
      for (const batch of batches) batchIds.add(batch.id);

      const batchIdList = batches.map((b) => b.id);
      if (batchIdList.length > 0) {
        const sections = await prisma.batchSection.findMany({
          where: { batchId: { in: batchIdList } },
          select: { id: true },
        });
        for (const section of sections) sectionIds.add(section.id);
      }
    }

    return {
      userId: user.id,
      role: user.role.name,
      status: user.status,
      facultyIds: Array.from(facultyIds),
      departmentIds: Array.from(departmentIds),
      batchIds: Array.from(batchIds),
      sectionIds: Array.from(sectionIds),
    };
  }

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
    role: user.role.name,
    status: user.status,
    facultyIds: Array.from(facultyIds),
    departmentIds: Array.from(departmentIds),
    batchIds: Array.from(batchIds),
    sectionIds: Array.from(sectionIds),
  };
}
