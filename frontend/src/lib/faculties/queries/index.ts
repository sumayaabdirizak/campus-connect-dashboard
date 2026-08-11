import type { QueryFunctionContext } from '@/lib/async-query';
import { useQuery } from '@/lib/async-query';
import { fetchAllFaculties, fetchFacultiesWithoutDean } from '../services';
import type { FacultyFormValues } from '../types';

const API_BASE = '/faculties';

// Query options for fetching faculties with filters
export const facultiesQueryOptions = (filters: any = {}) => ({
  queryKey: ['faculties', filters],
  queryFn: async ({ queryKey }: QueryFunctionContext) => {
    const [, params] = queryKey as [string, any];
    let endpoint = API_BASE;
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page);
    if (params?.limit) searchParams.append('limit', params.limit);
    if (params?.sort) searchParams.append('sort', params.sort);
    if ([...searchParams].length > 0) endpoint += `?${searchParams.toString()}`;
    return fetch(endpoint).then((res) => res.json());
  }
});

// Query options for fetching single faculty by id
export const facultyByIdOptions = (id: number | string) => ({
  queryKey: ['faculties', id],
  queryFn: async () => {
    const response = await fetch(`${API_BASE}/${id}`);
    return response.json();
  }
});

// Query options for faculties without dean
export const facultiesWithoutDeanQueryOptions = (search?: string) => ({
  queryKey: ['faculties', { withoutDean: true, search: search ?? '' }] as const,
  queryFn: () => fetchFacultiesWithoutDean(search)
});

// Hook for faculties without dean
export const useFacultiesWithoutDean = (search?: string) =>
  useQuery(facultiesWithoutDeanQueryOptions(search));

// Mutation configs for create/update/delete
export const createFacultyMutation = {
  mutationFn: async (values: FacultyFormValues) => {
    const response = await fetch(API_BASE, {
      method: 'POST',
      body: JSON.stringify(values)
    });
    return response.json();
  }
};

export const updateFacultyMutation = {
  mutationFn: async ({ id, values }: { id: number | string; values: FacultyFormValues }) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(values)
    });
    return response.json();
  }
};

export const deleteFacultyMutation = {
  mutationFn: async (id: number | string) => {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    return response.json();
  }
};
