import { apiClient } from '@/lib/api-client';

export type AdminBatch = {
  id: number;
  name: string;
  semester_number: number;
  academic_year: number;
  programId: number;
  academicYearId: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'GRADUATED';
  cohortSemester?: number;
  maxSemesters?: number;
  durationYears?: number;
  isGraduated?: boolean;
  graduatedAt?: string | null;
  currentSemesterInYear?: number;
  currentAcademicYearName?: string;
  program?: {
    id: number;
    name: string;
    code: string;
    durationYears?: number;
  };
  academicYear?: { id: number; name: string };
  graduationAcademicYear?: { id: number; name: string } | null;
};

export type BatchSection = {
  id: number;
  name: string;
  batchId: number;
  batch?: {
    id: number;
    name: string;
    programId?: number;
    academicYearId?: number;
    status?: string;
  };
};

export type BatchInput = {
  name: string;
  programId: number;
  academicYearId: number;
  semester_number: number;
  academic_year: number;
};

export type ProgramOption = {
  id: number;
  name: string;
  code: string;
  durationYears?: number;
  department?: {
    code: string;
    faculty?: {
      id: number;
      name: string;
      code: string;
      defaultDurationYears?: number;
    };
  };
};

export type SemesterOption = {
  id: number;
  name: string;
  sequence: number;
};

export type AcademicYearOption = {
  id: number;
  name: string;
  semesters?: SemesterOption[];
};

export const fetchAdminBatches = () =>
  apiClient<{ batches: AdminBatch[] }>('/batches');

export const fetchAdminBatchSections = async () => {
  const data = await apiClient<{ results?: BatchSection[]; sections?: BatchSection[] }>(
    '/batch-sections?limit=200'
  );
  return data.results ?? data.sections ?? [];
};

export const fetchBatchSectionsByBatch = async (batchId: number) => {
  const data = await apiClient<{ results?: BatchSection[]; sections?: BatchSection[] }>(
    `/batch-sections?batchId=${batchId}&limit=200`
  );
  return data.results ?? data.sections ?? [];
};

export const fetchAdminPrograms = async () => {
  const data = await apiClient<{ programs?: ProgramOption[]; results?: ProgramOption[] }>(
    '/programs?limit=200'
  );
  return data.programs ?? data.results ?? [];
};

export const fetchAdminAcademicYears = async () => {
  const data = await apiClient<{
    years?: AcademicYearOption[];
    results?: AcademicYearOption[];
    academicYears?: AcademicYearOption[];
  }>('/academic-years?limit=200');
  return data.years ?? data.results ?? data.academicYears ?? [];
};

export const createAdminBatch = (values: BatchInput) =>
  apiClient('/batches', { method: 'POST', body: JSON.stringify(values) });

export const createAdminBatchSection = (values: { name: string; batchId: number }) =>
  apiClient('/batch-sections', { method: 'POST', body: JSON.stringify(values) });

export const deleteAdminBatch = (id: number) =>
  apiClient(`/batches/${id}`, { method: 'DELETE' });

export const deleteAdminBatchSection = (id: number) =>
  apiClient(`/batch-sections/${id}`, { method: 'DELETE' });

export type SectionStudent = {
  id: number;
  registrationId: number;
  full_name: string;
  email: string;
  number?: string | null;
};

export const fetchSectionStudents = (sectionId: number) =>
  apiClient<{ students: SectionStudent[] }>(`/batch-sections/${sectionId}/students`);

export const addSectionStudents = (sectionId: number, studentIds: number[]) =>
  apiClient<{ message: string; added: number[]; skipped: number[] }>(
    `/batch-sections/${sectionId}/students`,
    { method: 'POST', body: JSON.stringify({ studentIds }) }
  );

export const removeSectionStudent = (sectionId: number, studentId: number) =>
  apiClient(`/batch-sections/${sectionId}/students/${studentId}`, {
    method: 'DELETE'
  });
