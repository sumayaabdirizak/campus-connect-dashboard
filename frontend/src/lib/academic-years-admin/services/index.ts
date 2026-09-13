import { apiClient } from '@/lib/api-client';

export type AdminSemester = {
  id: number;
  name: string;
  sequence: number;
  start_date: string;
  end_date: string;
  academicYearId: number;
};

export type AdminSemesterRow = AdminSemester & {
  academicYear?: { id: number; name: string };
};

export type AdminAcademicYear = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  semesters?: AdminSemester[];
  batches?: { id: number }[];
  activeSemester?: AdminSemester | null;
  yearSlot?: number | null;
  inActiveWindow?: boolean;
};

export type AcademicYearInput = {
  name: string;
  start_date: string;
  end_date: string;
};

export type SemesterInput = {
  name: string;
  start_date: string;
  end_date: string;
};

export const fetchAdminAcademicYears = async () => {
  const data = await apiClient<{ years?: AdminAcademicYear[] }>('/academic-years?limit=200');
  return data.years ?? [];
};

export const fetchAllSemesters = async (renumber = false) => {
  const query = renumber ? '?renumber=1' : '';
  const data = await apiClient<{ semesters?: AdminSemesterRow[] }>(
    `/academic-years/semesters${query}`
  );
  return data.semesters ?? [];
};

export const fetchNextSemesterNumbers = () =>
  apiClient<{
    nextSequences: number[];
    totalSemesters: number;
    totalAcademicYears: number;
    activeYearWindow: number;
  }>('/academic-years/semesters/next');

export const ensureSixAcademicYears = () =>
  apiClient<{
    message: string;
    windowSize: number;
    activeYears: string[];
    yearsCreated: number;
    semestersCreated: number;
    totalSemesters: number;
  }>('/academic-years/ensure-active-years', { method: 'POST' });

export const resetSemestersCatalog = () =>
  apiClient<{
    message: string;
    totalSemesters: number;
    activeYears: string[];
    deletedOfferings: number;
    deletedRegistrations: number;
  }>('/academic-years/reset-semesters', { method: 'POST' });

export const createAdminAcademicYear = (values: AcademicYearInput) =>
  apiClient<{ year: AdminAcademicYear; assignedSequences?: number[] }>('/academic-years', {
    method: 'POST',
    body: JSON.stringify(values)
  });

export const updateAdminAcademicYear = (id: number, values: AcademicYearInput) =>
  apiClient(`/academic-years/${id}`, { method: 'PUT', body: JSON.stringify(values) });

export const deleteAdminAcademicYear = (id: number) =>
  apiClient(`/academic-years/${id}`, { method: 'DELETE' });

export const promoteAdminAcademicYear = () =>
  apiClient<{ message: string; newYear: AdminAcademicYear }>('/academic-years/promote', {
    method: 'POST'
  });

export const createAdminSemester = (yearId: number, values: SemesterInput) =>
  apiClient(`/academic-years/${yearId}/semesters`, {
    method: 'POST',
    body: JSON.stringify(values)
  });

export const updateAdminSemester = (yearId: number, semesterId: number, values: SemesterInput) =>
  apiClient(`/academic-years/${yearId}/semesters/${semesterId}`, {
    method: 'PUT',
    body: JSON.stringify(values)
  });

export const deleteAdminSemester = (yearId: number, semesterId: number) =>
  apiClient(`/academic-years/${yearId}/semesters/${semesterId}`, { method: 'DELETE' });
