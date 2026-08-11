import { apiClient } from '@/lib/api-client';
import { Department, DepartmentsResponse } from '../types';

export const fetchDepartments = async () => {
  const response = await apiClient<DepartmentsResponse>('/departments');
  if (Array.isArray(response.departments)) return response;
  return {
    ...response,
    departments: response.results ?? []
  };
};

export const createDepartment = async (values: {
  name: string;
  code: string;
  facultyId: number;
}) =>
  apiClient('/departments', {
    method: 'POST',
    body: JSON.stringify({
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      facultyId: values.facultyId
    })
  });

export const updateDepartment = async ({
  id,
  values
}: {
  id: number;
  values: { name: string; code: string; facultyId: number };
}) =>
  apiClient(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      facultyId: values.facultyId
    })
  });

export const deleteDepartment = async (id: number) =>
  apiClient(`/departments/${id}`, { method: 'DELETE' });
