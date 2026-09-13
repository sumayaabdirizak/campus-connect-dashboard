import { apiClient } from '@/lib/api-client';
import { UserFilters, UsersResponse } from '../types';

export const fetchUsers = async (filters: UserFilters = {}) => {
  const { page = 1, limit = 10, search, roles } = filters;
  let endpoint = `/users?page=${page}&limit=${limit}`;
  if (search) endpoint += `&search=${encodeURIComponent(search)}`;
  if (roles) endpoint += `&role=${encodeURIComponent(roles)}`;

  const response = await apiClient<
    UsersResponse | { results: UsersResponse['users']; totalCount?: number; total?: number }
  >(endpoint);

  if ('users' in response) return response;

  return {
    message: 'Users loaded',
    users: response.results ?? [],
    total_users: response.totalCount ?? response.total ?? response.results?.length ?? 0
  };
};

export const createUser = async (data: Record<string, unknown>) => {
  return apiClient<unknown>('/users/register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export type BulkStudentsResult = {
  message: string;
  created: Array<{ id: number; full_name: string; email: string; number: string }>;
  errors: Array<{ email: string | null; full_name?: string; message: string }>;
};

export const registerStudentsBulk = async (data: {
  password: string;
  batchSectionId: number;
  academicYearId: number;
  semesterId: number;
  students: Array<{ full_name: string; email: string }>;
}) =>
  apiClient<BulkStudentsResult>('/users/register-bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  });

export const updateUser = async ({
  id,
  data
}: {
  id: number;
  data: {
    full_name: string;
    email: string;
    number: string;
  };
}) =>
  apiClient<unknown>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });

export const deleteUser = async (id: number | string) => {
  return apiClient<unknown>(`/users/${id}`, {
    method: 'DELETE'
  });
};

export type UserRolesResponse = { primaryRole: string; availableRoles: string[] };

export const fetchUserRoles = (id: number) =>
  apiClient<UserRolesResponse>(`/users/${id}/roles`);

export const grantUserRole = (id: number, role: string) =>
  apiClient<UserRolesResponse & { message: string }>(`/users/${id}/roles`, {
    method: 'POST',
    body: JSON.stringify({ role })
  });

export const revokeUserRole = (id: number, role: string) =>
  apiClient<UserRolesResponse & { message: string }>(
    `/users/${id}/roles/${encodeURIComponent(role)}`,
    { method: 'DELETE' }
  );

export const fetchBatchSections = async () => {
  const response = await apiClient<{
    sections?: Array<{
      id: number;
      name: string;
      batch?: {
        name: string;
        academicYearId?: number;
        program?: { department?: { code?: string } };
        academicYear?: {
          id: number;
          semesters?: Array<{ id: number; name: string; sequence?: number }>;
        };
      };
    }>;
    results?: Array<{
      id: number;
      name: string;
      batch?: {
        name: string;
        academicYearId?: number;
        program?: { department?: { code?: string } };
        academicYear?: {
          id: number;
          semesters?: Array<{ id: number; name: string; sequence?: number }>;
        };
      };
    }>;
  }>('/batch-sections?limit=200');
  const sections = response.sections ?? response.results ?? [];
  return { sections };
};

export const fetchCourses = async () =>
  apiClient<{ courses: Array<{ id: number; code: string; name: string }> }>('/courses');

export const fetchAcademicYears = async () => {
  const response = await apiClient<{
    years?: Array<{
      id: number;
      name: string;
      semesters?: Array<{ id: number; name: string; sequence?: number }>;
    }>;
    academicYears?: Array<{
      id: number;
      name: string;
      semesters?: Array<{ id: number; name: string; sequence?: number }>;
    }>;
    data?: Array<{
      id: number;
      name: string;
      semesters?: Array<{ id: number; name: string; sequence?: number }>;
    }>;
    results?: Array<{
      id: number;
      name: string;
      semesters?: Array<{ id: number; name: string; sequence?: number }>;
    }>;
  }>('/academic-years?limit=200');
  const academicYears =
    response.years ??
    response.academicYears ??
    response.data ??
    response.results ??
    [];
  return { academicYears };
};

export * from './dean-service';
export * from './user-form-state';
export * from './user-form-validation';
export * from './parse-student-csv';
export * from './auto-id-hint';
export * from './build-register-payload';
export * from './use-user-form-reference-data';
export * from './users-table-utils';
