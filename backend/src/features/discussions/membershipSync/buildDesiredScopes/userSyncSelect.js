export const userSyncSelect = {
  id: true,
  status: true,
  role: { select: { name: true } },
  deanProfile: { select: { facultyId: true } },
  facultiesAsDean: { select: { id: true } },
  lecturerProfile: {
    select: {
      departmentId: true,
      faculties: { select: { facultyId: true } },
    },
  },
  studentProfile: {
    select: {
      facultyId: true,
      departmentId: true,
    },
  },
  studentRegistrations: {
    select: {
      batchSectionId: true,
      batchSection: {
        select: {
          batchId: true,
          batch: {
            select: {
              id: true,
              program: {
                select: {
                  departmentId: true,
                  department: { select: { id: true, facultyId: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  teacherAssignings: {
    select: {
      course: {
        select: {
          offerings: {
            select: { sectionId: true, section: { select: { batchId: true } } },
          },
        },
      },
    },
  },
};
