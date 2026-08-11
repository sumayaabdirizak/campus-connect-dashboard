export type UserFormState = {
  full_name: string;
  email: string;
  number: string;
  role: string;
  password: string;
  departmentCode: string;
  facultyId: string;
  secondaryFacultyId: string;
  departmentId: string;
  programId: string;
  batchId: string;
  batchSectionId: string;
  academicYearId: string;
  semesterId: string;
  courseIds: string[];
  officeId: string;
  officeStaffRole: 'AGENT' | 'MANAGER';
};

export const EMPTY_USER_FORM: UserFormState = {
  full_name: '',
  email: '',
  number: '',
  role: 'STUDENT',
  password: '',
  departmentCode: '',
  facultyId: '',
  secondaryFacultyId: '',
  departmentId: '',
  programId: '',
  batchId: '',
  batchSectionId: '',
  academicYearId: '',
  semesterId: '',
  courseIds: [],
  officeId: '',
  officeStaffRole: 'AGENT'
};

export function roleRequiresOffice(role: string): boolean {
  const key = role.toUpperCase();
  if (key === 'ACADEMIC_OFFICE') return false;
  return key === 'OFFICE_STAFF' || key.includes('OFFICE') || key.includes('STAFF');
}

export const CREATE_ROLES = [
  'STUDENT',
  'TEACHER',
  'DEAN',
  'ACADEMIC_OFFICE',
  'SUPER_ADMIN'
] as const;
