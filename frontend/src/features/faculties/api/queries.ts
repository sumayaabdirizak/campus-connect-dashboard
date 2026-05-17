import type { QueryFunctionContext } from '@/lib/async-query';
import { FacultyFormValues } from '../schemas/faculty';
import { apiClient } from '@/lib/api-client';

// API BASE (adjust for your backend)
const API_BASE = '/faculties';

// 1. Fetch faculties list (with optional search/filter/pagination)
export const facultiesQueryOptions = (filters: any = {}) => ({
  queryKey: ['faculties', filters],
  queryFn: async ({ queryKey }: QueryFunctionContext) => {
    // Build query string if you want filter/pagination etc.
    const [, params] = queryKey as [string, any];
    let endpoint = API_BASE;
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page);
    if (params?.limit) searchParams.append('limit', params.limit);
    if (params?.sort) searchParams.append('sort', params.sort);
    if ([...searchParams].length > 0) endpoint += `?${searchParams.toString()}`;

    return apiClient<any[]>(endpoint);
  }
});

// 2. Fetch a single faculty by id
export const facultyByIdOptions = (id: number | string) => ({
  queryKey: ['faculties', id],
  queryFn: async () => apiClient<any>(`${API_BASE}/${id}`)
});

// 3. Create a new faculty
export const createFacultyMutation = {
  mutationFn: async (values: FacultyFormValues) => {
    return apiClient<any>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(values)
    });
  }
};

// 4. Update a faculty
export const updateFacultyMutation = {
  mutationFn: async ({ id, values }: { id: number | string; values: FacultyFormValues }) => {
    return apiClient<any>(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(values)
    });
  }
};

// 5. Delete a faculty
export const deleteFacultyMutation = {
  mutationFn: async (id: number | string) => {
    return apiClient<any>(`${API_BASE}/${id}`, { method: 'DELETE' });
  }
};
