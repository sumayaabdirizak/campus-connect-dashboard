/**
 * University-level academic desks (Messages targets).
 * Per-faculty Dean's Offices are created dynamically from Faculty rows.
 * ACADEMIC_OFFICE role oversees these; it is not itself a chat target.
 */
export const UNIVERSITY_SUPPORT_OFFICES = Object.freeze([
  {
    name: 'Student Affairs',
    slug: 'student-affairs',
    codePrefix: 'SAF',
    description: 'Student welfare, discipline, and campus life support.',
  },
  {
    name: 'Registrar',
    slug: 'registrar',
    codePrefix: 'REG',
    description: 'Enrollment, transcripts, records, and registration.',
  },
  {
    name: 'Exam Office',
    slug: 'exam-office',
    codePrefix: 'EXM',
    description: 'Examinations, scheduling, and results inquiries.',
  },
]);

/** @deprecated use UNIVERSITY_SUPPORT_OFFICES */
export const DEFAULT_SUPPORT_OFFICES = UNIVERSITY_SUPPORT_OFFICES;

/**
 * @param {{ id: number, name: string, code: string }} faculty
 */
export function deanOfficeDefForFaculty(faculty) {
  const code = String(faculty.code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const slugCode = String(faculty.code || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return {
    name: `Dean's Office — ${faculty.name}`,
    slug: `deans-office-${slugCode || faculty.id}`,
    codePrefix: (code ? `D${code}` : 'DEAN').slice(0, 6),
    description: `Faculty dean inquiries for ${faculty.name}.`,
    facultyId: faculty.id,
  };
}
