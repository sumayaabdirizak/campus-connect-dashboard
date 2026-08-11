import { apiClient } from '@/lib/api-client';

export interface Program {
  id: number;
  name: string;
  code: string;
  level: 'UNDERGRADUATE' | 'POSTGRADUATE';
  departmentId: number;
  durationYears: number;
  department?: {
    id: number;
    name: string;
    faculty?: { id: number; name: string; code: string; defaultDurationYears?: number };
  };
  created_at: string;
  updated_at: string;
}

export interface ProgramsResponse {
  message: string;
  programs: Program[];
  status?: string;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  results?: Program[];
}

export const fetchPrograms = async () => {
  const response = await apiClient<ProgramsResponse>('/programs');
  if (Array.isArray(response.programs)) return response;
  return {
    ...response,
    programs: response.results ?? []
  };
};

export type ProgramInput = Pick<
  Program,
  'name' | 'code' | 'level' | 'departmentId' | 'durationYears'
>;

export const createProgram = async (values: ProgramInput) =>
  apiClient('/programs', { method: 'POST', body: JSON.stringify(values) });

export const updateProgram = async ({ id, values }: { id: number; values: ProgramInput }) =>
  apiClient(`/programs/${id}`, { method: 'PUT', body: JSON.stringify(values) });

export const deleteProgram = async (id: number) =>
  apiClient(`/programs/${id}`, { method: 'DELETE' });
