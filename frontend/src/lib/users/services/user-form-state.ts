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
};

export const CREATE_ROLES = [
  'STUDENT',
  'TEACHER',
  'DEAN',
  'SUPER_ADMIN',
] as const;
