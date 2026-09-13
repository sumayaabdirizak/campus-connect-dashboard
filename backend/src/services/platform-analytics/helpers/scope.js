export function offeringWhere(facultyId) {
  if (!facultyId) return {};
  return { section: { batch: { program: { department: { facultyId } } } } };
}

export function studentWhere(facultyId) {
  if (!facultyId) return {};
  return { facultyId };
}

export function facultyUserWhere(facultyId) {
  if (!facultyId) return {};
  return {
    OR: [
      { studentProfile: { facultyId } },
      { lecturerProfile: { faculties: { some: { facultyId } } } },
    ],
  };
}

export function messageSenderFacultyWhere(facultyId) {
  if (!facultyId) return {};
  return {
    sender: {
      OR: [
        { studentProfile: { facultyId } },
        { lecturerProfile: { faculties: { some: { facultyId } } } },
      ],
    },
  };
}
