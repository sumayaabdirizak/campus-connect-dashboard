import type { QueryFunctionContext } from '@/lib/async-query';
import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import {
  fetchFacultiesWithoutDean,
  createFaculty,
  updateFaculty,
  deleteFaculty
} from '../services';
import type { FacultyFormValues, FacultiesResponse } from '../types';

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
    return apiClient<FacultiesResponse>(endpoint);
  }
});

// Query options for fetching single faculty by id
export const facultyByIdOptions = (id: number | string) => ({
  queryKey: ['faculties', id],
  queryFn: async () => apiClient<any>(`${API_BASE}/${id}`)
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
  mutationFn: (values: FacultyFormValues) => createFaculty(values)
};

export const updateFacultyMutation = {
  mutationFn: ({ id, values }: { id: number | string; values: FacultyFormValues }) =>
    updateFaculty({ id, values })
};

export const deleteFacultyMutation = {
  mutationFn: (id: number | string) => deleteFaculty(id)
};
