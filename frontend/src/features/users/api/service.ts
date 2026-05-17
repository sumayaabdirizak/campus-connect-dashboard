import { apiClient } from '@/lib/api-client';
import { UserFilters, UsersResponse } from './types';

// Fetch all users with filters
export const fetchUsers = async (filters: UserFilters = {}) => {
  const { page = 1, limit = 10, search } = filters;
  let endpoint = `/users?page=${page}&limit=${limit}`;
  if (search) endpoint += `&search=${encodeURIComponent(search)}`;

  return apiClient<UsersResponse>(endpoint);
};

// Create user
export const createUser = async (data: any) => {
  return apiClient<any>('/users/register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// Delete user
export const deleteUser = async (id: number | string) => {
  return apiClient<any>(`/users/${id}`, {
    method: 'DELETE'
  });
};

export const fetchBatchSections = async () => apiClient<any>('/batch-sections');
export const fetchCourses = async () => apiClient<any>('/courses');
export const fetchAcademicYears = async () => apiClient<any>('/academic-years');
