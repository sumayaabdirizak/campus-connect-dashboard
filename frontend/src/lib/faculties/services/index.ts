import { apiClient } from '@/lib/api-client';
import type { FacultyOption, FacultiesResponse, FacultyFormValues } from '../types';

// API BASE (adjust for your backend)
const API_BASE = '/faculties';

// Normalize faculties list response
export function normalizeFacultiesList(
  data: FacultiesResponse | FacultyOption[] | null | undefined
): FacultyOption[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.faculties)) return data.faculties;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

// API functions
export const fetchAllFaculties = async () => {
  const data = await apiClient<FacultiesResponse>('/faculties?limit=200');
  return normalizeFacultiesList(data);
};

export const fetchFacultiesWithoutDean = async (search?: string) => {
  const params = new URLSearchParams({ withoutDean: '1', limit: '200' });
  if (search?.trim()) params.set('search', search.trim());
  const data = await apiClient<FacultiesResponse>(`/faculties?${params.toString()}`);
  return normalizeFacultiesList(data);
};

export const createFaculty = async (values: FacultyFormValues) => {
  return apiClient<any>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(values)
  });
};

export const updateFaculty = async ({ id, values }: { id: number | string; values: FacultyFormValues }) => {
  return apiClient<any>(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(values)
  });
};

export const deleteFaculty = async (id: number | string) => {
  return apiClient<any>(`${API_BASE}/${id}`, { method: 'DELETE' });
};
